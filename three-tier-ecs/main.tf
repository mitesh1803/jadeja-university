terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
  # Uses your AWS CLI profile / env vars / OIDC role - no static keys in this repo.
}

data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------
module "vpc" {
  source                = "./modules/vpc"
  project_name          = var.project_name
  vpc_cidr              = var.vpc_cidr
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
}

module "security_groups" {
  source        = "./modules/security-groups"
  project_name  = var.project_name
  vpc_id        = module.vpc.vpc_id
  frontend_port = var.frontend_port
  backend_port  = var.backend_port
}

# Opens your EXISTING RDS security group to the backend tier only.
module "rds_access" {
  source                = "./modules/rds-access"
  rds_security_group_id = var.rds_security_group_id
  backend_sg_id         = module.security_groups.backend_sg_id
  rds_port              = var.rds_port
}

# ---------------------------------------------------------------------------
# Container registry + cluster
# ---------------------------------------------------------------------------
module "ecr_frontend" {
  source = "./modules/ecr"
  name   = "${var.project_name}-frontend"
}

module "ecr_backend" {
  source = "./modules/ecr"
  name   = "${var.project_name}-backend"
}

module "ecs_cluster" {
  source = "./modules/ecs-cluster"
  name   = var.project_name
}

# ---------------------------------------------------------------------------
# Load balancer (single entry point, path-based routing: /api/* -> backend)
# ---------------------------------------------------------------------------
module "alb" {
  source            = "./modules/alb"
  project_name      = var.project_name
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  alb_sg_id         = module.security_groups.alb_sg_id
  frontend_port     = var.frontend_port
  backend_port      = var.backend_port
  certificate_arn   = var.certificate_arn
}

# ---------------------------------------------------------------------------
# Secrets - created here so nothing sensitive lives in .tf files or images
# ---------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "database_url" {
  name = "${var.project_name}/database-url"
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = var.database_url
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

# ---------------------------------------------------------------------------
# Backend service
# ---------------------------------------------------------------------------
module "backend_service" {
  source             = "./modules/ecs-service"
  name               = "${var.project_name}-backend"
  region             = var.region
  cluster_id         = module.ecs_cluster.id
  image              = "${module.ecr_backend.repository_url}:${var.backend_image_tag}"
  container_port     = var.backend_port
  cpu                = var.backend_cpu
  memory             = var.backend_memory
  desired_count      = var.backend_desired_count
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_id  = module.security_groups.backend_sg_id
  target_group_arn   = module.alb.backend_tg_arn

  environment = [
    { name = "PORT", value = tostring(var.backend_port) },
    { name = "FRONTEND_URL", value = var.certificate_arn == "" ? "http://${module.alb.dns_name}" : "https://${module.alb.dns_name}" },
    { name = "NODE_ENV", value = "production" },
  ]

  secrets = [
    { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
    { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
  ]

  secret_arns = [
    aws_secretsmanager_secret.database_url.arn,
    aws_secretsmanager_secret.jwt_secret.arn,
  ]
}

# ---------------------------------------------------------------------------
# Frontend service
# ---------------------------------------------------------------------------
module "frontend_service" {
  source             = "./modules/ecs-service"
  name               = "${var.project_name}-frontend"
  region             = var.region
  cluster_id         = module.ecs_cluster.id
  image              = "${module.ecr_frontend.repository_url}:${var.frontend_image_tag}"
  container_port     = var.frontend_port
  cpu                = var.frontend_cpu
  memory             = var.frontend_memory
  desired_count      = var.frontend_desired_count
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_id  = module.security_groups.frontend_sg_id
  target_group_arn   = module.alb.frontend_tg_arn
}

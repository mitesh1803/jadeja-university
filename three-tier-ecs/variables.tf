variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "project_name" {
  type    = string
  default = "jadeja"
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------
variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.11.0/24", "10.0.12.0/24"]
}

# ---------------------------------------------------------------------------
# Existing RDS instance - this repo does NOT create RDS, only opens access to it
# ---------------------------------------------------------------------------
variable "rds_security_group_id" {
  type        = string
  description = "Security group ID already attached to your existing RDS instance"
}

variable "rds_port" {
  type    = number
  default = 5432
}

# ---------------------------------------------------------------------------
# App ports (must match your Dockerfiles / nginx.conf)
# ---------------------------------------------------------------------------
variable "frontend_port" {
  type    = number
  default = 8080
}

variable "backend_port" {
  type    = number
  default = 4000
}

# ---------------------------------------------------------------------------
# Images
# ---------------------------------------------------------------------------
variable "frontend_image_tag" {
  type    = string
  default = "latest"
}

variable "backend_image_tag" {
  type    = string
  default = "latest"
}

# ---------------------------------------------------------------------------
# Sizing
# ---------------------------------------------------------------------------
variable "frontend_cpu" {
  type    = number
  default = 256
}

variable "frontend_memory" {
  type    = number
  default = 512
}

variable "frontend_desired_count" {
  type    = number
  default = 1
}

variable "backend_cpu" {
  type    = number
  default = 256
}

variable "backend_memory" {
  type    = number
  default = 512
}

variable "backend_desired_count" {
  type    = number
  default = 1
}

# ---------------------------------------------------------------------------
# Secrets - pass via terraform.tfvars (gitignored) or TF_VAR_ env vars, never commit
# ---------------------------------------------------------------------------
variable "database_url" {
  type        = string
  sensitive   = true
  description = "Full Postgres connection string, e.g. postgresql://user:pass@<rds-endpoint>:5432/dbname"
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

# ---------------------------------------------------------------------------
# Optional HTTPS - leave blank to run HTTP-only on the ALB for now
# ---------------------------------------------------------------------------
variable "certificate_arn" {
  type    = string
  default = ""
}

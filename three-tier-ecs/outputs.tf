output "alb_dns_name" {
  value       = module.alb.dns_name
  description = "Point your domain (or just browse) here"
}

output "frontend_ecr_repository_url" {
  value = module.ecr_frontend.repository_url
}

output "backend_ecr_repository_url" {
  value = module.ecr_backend.repository_url
}

output "ecs_cluster_name" {
  value = module.ecs_cluster.name
}

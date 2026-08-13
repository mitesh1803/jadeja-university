variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "cluster_id" {
  type = string
}

variable "image" {
  type        = string
  description = "Full image URI including tag, e.g. <account>.dkr.ecr.<region>.amazonaws.com/repo:tag"
}

variable "container_port" {
  type = number
}

variable "cpu" {
  type    = number
  default = 256
}

variable "memory" {
  type    = number
  default = 512
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_id" {
  type = string
}

variable "target_group_arn" {
  type = string
}

variable "environment" {
  description = "Plain (non-secret) env vars: [{ name = \"PORT\", value = \"4000\" }]"
  type        = list(object({ name = string, value = string }))
  default     = []
}

variable "secrets" {
  description = "Secrets injected from Secrets Manager: [{ name = \"DATABASE_URL\", valueFrom = \"<secret-arn>\" }]"
  type        = list(object({ name = string, valueFrom = string }))
  default     = []
}

variable "secret_arns" {
  description = "ARNs referenced in `secrets`, used to scope the execution role's IAM policy"
  type        = list(string)
  default     = []
}

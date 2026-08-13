variable "rds_security_group_id" {
  type        = string
  description = "Security group ID already attached to your existing RDS instance"
}

variable "backend_sg_id" {
  type = string
}

variable "rds_port" {
  type    = number
  default = 5432
}

# Opens the *existing* RDS security group to the backend ECS tasks only.
# This does NOT create or modify the RDS instance itself.
resource "aws_security_group_rule" "backend_to_rds" {
  type                     = "ingress"
  from_port                = var.rds_port
  to_port                  = var.rds_port
  protocol                 = "tcp"
  security_group_id        = var.rds_security_group_id
  source_security_group_id = var.backend_sg_id
  description               = "Allow backend ECS tasks to reach RDS"
}

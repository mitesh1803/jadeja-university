# jadeja-university — ECS Terraform 

## Before you run this

1. **Find your RDS security group ID**
   RDS console → your DB instance → Connectivity & security → VPC security groups.

2. **Push your images to ECR** (the ECR repos are created by this Terraform, so do
   this after the first `apply`, or run `apply` once, push images, then `apply` again
   to roll out the real image):
   ```bash
   aws ecr get-login-password --region ap-south-1 | \
     docker login --username AWS --password-stdin <account>.dkr.ecr.ap-south-1.amazonaws.com

   docker build -t jadeja-backend ./backend
   docker tag jadeja-backend:latest <account>.dkr.ecr.ap-south-1.amazonaws.com/jadeja-backend:latest
   docker push <account>.dkr.ecr.ap-south-1.amazonaws.com/jadeja-backend:latest

   docker build -t jadeja-frontend ./frontend
   docker tag jadeja-frontend:latest <account>.dkr.ecr.ap-south-1.amazonaws.com/jadeja-frontend:latest
   docker push <account>.dkr.ecr.ap-south-1.amazonaws.com/jadeja-frontend:latest
   ```

3. **Fill in your variables**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   # edit terraform.tfvars with your rds_security_group_id, database_url, jwt_secret
   ```

## Deploy

```bash
terraform init
terraform plan
terraform apply
```

Terraform will print `alb_dns_name` — that's your app's URL (HTTP for now).
Open `http://<alb_dns_name>` for the frontend; the frontend's own API calls to
`/api/v1/...` are routed to the backend automatically by the ALB.

## Known follow-ups (deliberately left out to keep this apply-able today)
- **HTTPS**: request a cert in ACM, pass its ARN as `certificate_arn`, `apply` again.
  A 301 redirect from :80 to :443 is already wired up for when you do this.
- **Autoscaling**: both services run a fixed `desired_count`. Add
  `aws_appautoscaling_target`/`policy` on the ECS service if you need scale-out.
- **Migration race**: `docker-entrypoint.sh` runs `prisma migrate deploy` on every
  container boot. Fine at `desired_count = 1`. If you scale the backend beyond 1,
  consider running migrations as a one-off ECS task before rolling the service instead.
- **Multi-AZ NAT**: this uses a single NAT gateway (cheaper). For production HA,
  add one NAT per AZ in the vpc module.

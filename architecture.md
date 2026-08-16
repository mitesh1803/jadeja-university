# 🏗️ Jadeja University — Complete AWS Architecture

```text
                                      INTERNET
                                          │
                                          │ HTTPS :443
                                          ▼
                              ┌──────────────────────┐
                              │   YOUR DOMAIN/DNS    │
                              │ example.com          │
                              │ Existing DNS Provider│
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │       AWS WAF        │
                              │                      │
                              │ • OWASP rules        │
                              │ • Bad IP protection  │
                              │ • Rate limiting      │
                              └──────────┬───────────┘
                                         │
                                         ▼
                        ┌─────────────────────────────────┐
                        │       APPLICATION LOAD          │
                        │          BALANCER (ALB)         │
                        │                                 │
                        │ HTTP :80  → HTTPS :443         │
                        └───────────────┬─────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │                             │
                    /*   │                             │ /api/*
                         ▼                             ▼
              ┌────────────────────┐       ┌────────────────────┐
              │ ECS FRONTEND       │       │ ECS BACKEND        │
              │ Fargate            │       │ Fargate            │
              │                    │       │                    │
              │ React + Vite       │       │ Node.js            │
              │ Nginx              │       │ Express            │
              │ Port 8080          │       │ Port 4000          │
              └────────────────────┘       └─────────┬──────────┘
                                                     │
                                                     │ TCP 5432
                                                     │
                                                     ▼
                                            ┌───────────────────┐
                                            │    RDS PostgreSQL │
                                            │                   │
                                            │ Private Subnet    │
                                            │ Port 5432         │
                                            └───────────────────┘


        ┌─────────────────────────────────────────────────────────┐
        │                    SECURITY & OPERATIONS                │
        │                                                         │
        │ Secrets Manager → DATABASE_URL / JWT_SECRET             │
        │ IAM              → Least privilege                      │
        │ Security Groups  → ALB → ECS → RDS                      │
        │ CloudWatch       → ECS logs + metrics                   │
        │ CloudTrail       → AWS API auditing                     │
        │ GuardDuty        → Threat detection [optional]          │
        │ Security Hub     → Security findings [optional]         │
        └─────────────────────────────────────────────────────────┘


                         CI/CD + DEVSECOPS
                                │
                                ▼
                           GitHub
                                │
                                ▼
                       GitHub Actions
                                │
                 ┌──────────────┼───────────────┐
                 │              │               │
              Tests          SAST           Dependency
                 │           CodeQL             Scan
                 │              │               │
                 └──────────────┼───────────────┘
                                │
                         Docker Build
                                │
                              Trivy
                                │
                                ▼
                              ECR
                         ┌──────┴──────┐
                         │             │
                    frontend       backend
                         │             │
                         └──────┬──────┘
                                ▼
                              ECS
```

---

# 1. 🌐 Internet / Domain Layer

Your users will access:

```text
https://yourdomain.com
```

The request path is:

```text
User
 ↓
Domain DNS
 ↓
WAF
 ↓
ALB
 ↓
ECS
```

### Domain

You already have a domain.

You **don't have to transfer it to Route 53**.

You can keep the domain at your current registrar/DNS provider and point it toward your ALB.

Route 53 is therefore:

```text
OPTIONAL
```

rather than mandatory.

---

# 2. 🔐 AWS WAF

This is one of the remaining pieces.

Architecture:

```text
Internet
   │
   ▼
 WAF
   │
   ▼
 ALB
```

WAF should provide:

### Managed rules

Use AWS Managed Rules such as:

```text
AWSManagedRulesCommonRuleSet
AWSManagedRulesKnownBadInputsRuleSet
```

### Rate limiting

Especially protect:

```text
/api/v1/auth/*
```

because login/register endpoints are common brute-force targets.

Conceptually:

```text
100 requests / 5 minutes / IP
          │
          ▼
       BLOCK
```

Don't make the WAF excessively complicated initially.

---

# 3. 🔒 ACM

ACM = **AWS Certificate Manager**.

This gives your ALB HTTPS.

You want:

```text
HTTP :80
     │
     ▼
Redirect
     │
     ▼
HTTPS :443
```

ACM certificate:

```text
yourdomain.com
www.yourdomain.com
```

Then:

```text
ALB :443
   │
   └── ACM certificate
```

This means users see:

```text
🔒 https://yourdomain.com
```

instead of:

```text
http://...
```

---

# 4. ⚖️ Application Load Balancer

```text
Internet
    │
    ▼
   ALB
    │
    ├──→ Frontend
    │
    └──→ Backend
```

---

# 5. ALB Routing
 ALB rules:

```text
Path:
/api/*

        ↓

Backend Target Group
```

and:

```text
Default:
/*

        ↓

Frontend Target Group
```

So:

```text
GET /
   ↓
Frontend ECS

GET /login
   ↓
Frontend ECS

GET /api/v1/courses
   ↓
Backend ECS

POST /api/v1/auth/login
   ↓
Backend ECS
```

---

# 6. 🖥️ ECS Fargate

Application has **two ECS services**.

```text
ECS Cluster
│
├── frontend-service
│
└── backend-service
```

## Frontend

```text
React
 ↓
Vite
 ↓
Nginx
 ↓
ECS Fargate
```

Container:

```text
Port 8080
```
 Dockerfile uses a multi-stage build:

```text
Node
 ↓
npm build
 ↓
Nginx
```
---

# 7. Backend ECS

Backend is:

```text
Node.js
 ↓
Express
 ↓
Prisma
```

Container:

```text
Port 4000
```

Previous Docker architecture

```text
docker-entrypoint.sh
      ↓
prisma migrate deploy
      ↓
node
```
---

# 8. Prisma


Initially:

```text
Prisma
 ↓
OpenSSL 1.1 engine
 ↓
Alpine
 ↓
libssl.so.1.1 missing
```


Current architecture is:

```text
Node 24 Alpine
       │
       ▼
OpenSSL 3
       │
       ▼
Prisma
       │
       ▼
PostgreSQL
```
---

# 9. 🗄️ RDS PostgreSQL

Production database.

```text
ECS Backend
     │
     │ TCP 5432
     ▼
RDS PostgreSQL
```

---

# 10. RDS Security Group


```text
Inbound

TCP 5432
Source: ECS-SG
```
---

# 11. 🛡️ Security Groups


### ALB-SG

```text
Inbound:

80  ← Internet
443 ← Internet
```

### ECS-SG

```text
Inbound:

Frontend port ← ALB-SG
Backend port  ← ALB-SG
```

### RDS-SG

```text
Inbound:

5432 ← ECS-SG
```

Therefore:

```text
Internet
   │
   ▼
ALB-SG
   │
   ▼
ECS-SG
   │
   ▼
RDS-SG
```

---

# 12. 🔑 Secrets Manager

```text
AWS Secrets Manager
│
├── DATABASE_URL
│
└── JWT_SECRET
```

ECS injects:

```text
DATABASE_URL
JWT_SECRET
```

into the backend container.

So application simply uses:

```javascript
process.env.DATABASE_URL
```

and:

```javascript
process.env.JWT_SECRET
```

The application doesn't need to directly call Secrets Manager.

---

# 13. 🧬 Database migrations

We changed  architecture here too.

### ❌ Old approach

```text
ECS backend starts
      ↓
prisma migrate deploy
      ↓
Node starts
```

### ✅ New approach

```text
                ECS
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
 Migration Task       Backend Service
        │                  │
        ▼                  ▼
prisma migrate       node dist/index.js
deploy
        │
        ▼
       RDS
```


This becomes especially important while scale:

```text
Backend task 1
Backend task 2
Backend task 3
```
---

# 14. 📦 ECR

 Docker images are stored in Amazon ECR.

```text
ECR
│
├── jadeja-university/frontend
│
└── jadeja-university/backend
```

The pipeline builds images and pushes them to ECR.

Then ECS pulls the image.

```text
GitHub
  ↓
GitHub Actions
  ↓
Docker Build
  ↓
ECR
  ↓
ECS
```


---

# 15. 🔄 DevSecOps Pipeline

 Target flow is:

```text
Developer
    │
    ▼
GitHub
    │
    ▼
GitHub Actions
    │
    ├── Checkout
    │
    ├── Install dependencies
    │
    ├── Lint
    │
    ├── Unit/API tests
    │
    ├── CodeQL / SAST
    │
    ├── Dependency scanning
    │
    ├── Secret scanning
    │
    ├── Docker build
    │
    ├── Trivy image scan
    │
    └── Push to ECR
             │
             ▼
        ECS deployment
```
---

# 16. 🪵 CloudWatch

Backend logs:

```text
ECS
 ↓
awslogs
 ↓
CloudWatch Logs
```

For monitoring:

### ECS

```text
CPU
Memory
Task count
Task failures
Restart count
```

### ALB

```text
Request count
Latency
HTTP 4xx
HTTP 5xx
Healthy hosts
Unhealthy hosts
```

### RDS

```text
CPU
Connections
Storage
Read/write activity
```

---

# 17. 📜 CloudTrail

Configuration:

```text
Multi-region: YES
Management events: ALL
Log file validation: ENABLED
CloudWatch Logs: ENABLED
```

CloudTrail answers:

> **Who changed what in AWS?**

For example:

```text
Who changed the ECS service?
Who modified the security group?
Who changed the RDS configuration?
Who modified IAM?
```

So:

```text
CloudWatch
    =
Application monitoring

CloudTrail
    =
AWS account auditing
```
---


# 18. 🌐 CORS


Frontend uses:

```javascript
const BASE = '/api/v1';
```

```text
yourdomain.com
       │
       ├── /       → Frontend
       │
       └── /api/*  → Backend
```

the browser sees:

```text
https://yourdomain.com
```

for both.

Therefore:

```text
Frontend origin:
https://yourdomain.com

API:
https://yourdomain.com/api/v1
```

They're same-origin.

Production:

```env
FRONTEND_URL=https://yourdomain.com
```

instead of:

```env
FRONTEND_URL=http://localhost:5173
```

---

# 19. Nginx

```text
ALB
 ├── /
 │    ↓
Frontend ECS
 │
 └── /api/*
      ↓
Backend ECS
```
---

# 23. VPC


```text
                         VPC
                    10.0.0.0/16
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
    Public Subnet    Private App       Private DB
       AZ-A             AZ-A               AZ-A
          │               │                │
          │               │                │
          ▼               ▼                ▼
         ALB             ECS              RDS
```

And ideally another AZ:

```text
Public Subnet AZ-B
Private App AZ-B
Private DB AZ-B
```

---

# 19. NAT Gateway


 ECS tasks are in private subnets and need outbound internet access, for example:

```text
ECS
 ↓
npm/API/external service
```

they need a path through NAT Gateway.

Architecture:

```text
Private ECS
    │
    ▼
NAT Gateway
    │
    ▼
Internet Gateway
    │
    ▼
Internet
```

But:

```text
Internet
    X
    │
    ▼
Private ECS
```

There is **no inbound path from the internet**.

---

# 20. Complete request flow

Let's say a student opens:

```text
https://yourdomain.com/dashboard
```

The flow is:

```text
Student
  │
  ▼
DNS
  │
  ▼
WAF
  │
  ▼
ALB :443
  │
  ▼
Frontend Target Group
  │
  ▼
Frontend ECS
  │
  ▼
Nginx
  │
  ▼
React application
```

Then React makes:

```text
GET /api/v1/student/profile
```

Flow:

```text
Browser
  │
  ▼
https://yourdomain.com/api/v1/student/profile
  │
  ▼
WAF
  │
  ▼
ALB
  │
  │ /api/*
  ▼
Backend Target Group
  │
  ▼
Backend ECS
  │
  ▼
Express
  │
  ▼
Prisma
  │
  ▼
RDS PostgreSQL
```

Response:

```text
RDS
 ↓
Prisma
 ↓
Express
 ↓
ALB
 ↓
Browser
```

---

# 26. Complete deployment flow

When you push code:

```text
Developer
   │
   ▼
git push
   │
   ▼
GitHub
   │
   ▼
GitHub Actions
   │
   ├── Test
   ├── SAST
   ├── Dependency scan
   ├── Secret scan
   ├── Docker build
   ├── Trivy
   │
   ▼
ECR
   │
   ▼
ECS new deployment
   │
   ├── Migration task
   │       │
   │       ▼
   │      RDS
   │
   └── Backend/Frontend service
           │
           ▼
          ALB
           │
           ▼
         Users
```

---

# 27. 🔐 Complete security model

This is the security story you can explain in your presentation:

```text
Layer 1
DNS
│
└── Domain/DNS security

Layer 2
WAF
│
└── HTTP attack protection

Layer 3
ALB + HTTPS
│
└── TLS encryption

Layer 4
Security Groups
│
└── Network access control

Layer 5
Private ECS
│
└── No direct public access

Layer 6
Private RDS
│
└── Database isolated

Layer 7
Secrets Manager
│
└── No credentials in code

Layer 8
IAM
│
└── Least privilege

Layer 9
DevSecOps
│
├── SAST
├── Dependency scanning
├── Secret scanning
└── Container scanning

Layer 10
CloudTrail
│
└── AWS activity auditing

Layer 11
GuardDuty
│
└── Threat detection

Layer 12
Security Hub
│
└── Security posture
```

That's a very respectable security architecture for a student production project.

---

# 28. 📊 What is DONE vs REMAINING

Here's the cleanest status board for you.

### 🟢 DONE

```text
✅ AWS VPC
✅ Subnets
✅ Security Groups
✅ ECS Fargate
✅ ECS Cluster
✅ Frontend service
✅ Backend service
✅ RDS PostgreSQL
✅ ECR
✅ ALB
✅ Target Groups
✅ Secrets Manager
✅ Docker multi-stage builds
✅ Prisma
✅ Node 24 + OpenSSL 3 fix
✅ DevSecOps pipeline
✅ Docker/Trivy scanning
✅ GitHub Actions
✅ CloudWatch Logs
✅ CloudWatch ECS monitoring
```

### 🔵 REMAINING

```text
⬜ ACM certificate
⬜ HTTPS listener
⬜ Domain → ALB DNS
⬜ WAF
⬜ CloudTrail finalization
⬜ GuardDuty (optional)
⬜ Security Hub (optional)
⬜ Final security testing
⬜ Final production testing
```

---

# 29. 🎯 The final architecture you should present

If this is for your **hackathon/project presentation**, I would show this:

```text
                         ┌──────────────────┐
                         │     USERS        │
                         └────────┬─────────┘
                                  │
                               HTTPS
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  DOMAIN / DNS    │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │     AWS WAF      │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │          ALB            │
                    │    ACM / HTTPS :443     │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                  /*│                         │/api/*
                    ▼                         ▼
          ┌─────────────────┐       ┌─────────────────┐
          │ ECS FARGATE     │       │ ECS FARGATE     │
          │ FRONTEND        │       │ BACKEND         │
          │                 │       │                 │
          │ React + Nginx   │       │ Node + Express  │
          └─────────────────┘       └────────┬────────┘
                                             │
                                          Prisma
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │ RDS PostgreSQL  │
                                    │ PRIVATE         │
                                    └─────────────────┘


        ┌──────────────────────────────────────────────┐
        │              SECURITY                        │
        │                                              │
        │ IAM | SG | Secrets Manager | WAF | ACM      │
        └──────────────────────────────────────────────┘


        ┌──────────────────────────────────────────────┐
        │              OBSERVABILITY                   │
        │                                              │
        │ CloudWatch | CloudTrail | GuardDuty | Hub   │
        └──────────────────────────────────────────────┘


        ┌──────────────────────────────────────────────┐
        │              DEVSECOPS                       │
        │                                              │
        │ GitHub → Actions → Tests → SAST → Trivy     │
        │                    → ECR → ECS               │
        └──────────────────────────────────────────────┘
```


Once those are done, your architecture isn't just "a website deployed on AWS." It's a **containerized, three-tier, private-network, HTTPS, secrets-managed, load-balanced, DevSecOps-enabled AWS application with centralized observability and security controls.** 🔥

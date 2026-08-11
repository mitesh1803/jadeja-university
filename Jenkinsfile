pipeline {
    agent any

    tools {
        nodejs 'node20'
    }

    environment {
     DATABASE_URL = "postgresql://meetesh:1234@localhost:5432/jadeja-project"
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Code checkout'
            }
        }
        
        stage('Start Postgres (for testing)') {
            steps {
                //  db service starting, no backend/frontend  
                bat 'docker-compose up -d db'
                
                 bat 'ping -n 11 127.0.0.1 > nul'
            }
        }

        stage('Backend: Install deps') {
            steps {
                dir('backend') {
                    bat 'npm install'
                }
            }
        }

        stage('Backend: Prisma generate') {
            steps {
                dir('backend') {
                    bat 'npx prisma generate'
                }
            }
        } 
        stage('Debug: Check DATABASE_URL') {
            steps {
                bat 'echo DATABASE_URL is: %DATABASE_URL%'
            }
        }

        stage('Backend: DB migrate + seed') {
            steps {
                dir('backend') {
                    bat 'npx prisma migrate deploy'
                    bat 'node src/utils/seed.js'
                }
            }
        }

        stage('Backend: Build') {
            steps {
                dir('backend') {
                    // esbuild  src/index.js -> dist/index.js bundle check (Dockerfile uses this command )
                    bat 'npm run build'
                }
            }
        }

        stage('Frontend: Install deps') {
            steps {
                dir('frontend') {
                    bat 'npm install'
                }
            }
        }

        stage('Frontend: Lint') {
            steps {
                dir('frontend') {
                    bat 'npm run lint || echo Lint warnings but not stopping the build'
                }
            }
        }

        stage('Frontend: Build') {
            steps {
                dir('frontend') {
                    bat 'npm run build'
                }
            }
        }

        // ===== DOCKER STAGE (docker-compose use ) =====
        stage('Docker: Build all images') {
            steps {
              //The .env file is generated at runtime using credentials from the Jenkins Credentials Store (see the instructions below for setup)
                bat 'docker-compose build'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed— code + docker images working!!'
        }
        failure {
            echo 'Pipeline failed .'
        }
        always {
            echo 'Build completed.'
        }
    }
}

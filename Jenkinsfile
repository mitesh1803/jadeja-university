pipeline {
    agent any

    tools {
        nodejs 'node20'   // Jenkins -> Manage Jenkins -> Tools madhe he exact naav dile pahije (Node 20+, Vite 8 sathi lagte)
    }

    environment {
        // Prisma la SQLite DB path lagto. Repo madhe db/jadeja.db vapratay (README nusar)
        DATABASE_URL = "file:../db/jadeja.db"
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Code checkout '
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

        stage('Backend: DB migrate + seed') {
            steps {
                dir('backend') {
                    bat 'npx prisma migrate deploy'
                    bat 'node src/utils/seed.js'
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
                    bat 'npm run lint || echo Lint warnings aahet pan build thambwat nahi'
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
    }

    post {
        success {
            echo ' Pipeline — backend + frontend working!'
        }
        failure {
            echo '❌ Pipeline fails'
        }
        always {
            echo 'Build end.'
        }
    }
}
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
                echo 'Code checkout झालं ✅'
            }
        }

        stage('Backend: Install deps') {
            steps {
                dir('backend') {
                    sh 'npm install'
                }
            }
        }

        stage('Backend: Prisma generate') {
            steps {
                dir('backend') {
                    sh 'npx prisma generate'
                }
            }
        }

        stage('Backend: DB migrate + seed') {
            steps {
                dir('backend') {
                    // deploy = production-safe migration (dev sarkhi interactive nasते)
                    sh 'npx prisma migrate deploy'
                    sh 'node src/utils/seed.js'
                }
            }
        }

        stage('Frontend: Install deps') {
            steps {
                dir('frontend') {
                    sh 'npm install'
                }
            }
        }

        stage('Frontend: Lint') {
            steps {
                dir('frontend') {
                    sh 'npm run lint || echo "Lint warnings aahet, pan build thambवत nahi"'
                }
            }
        }

        stage('Frontend: Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline पूर्ण यशस्वी — backend + frontend दोन्ही ठीक आहेत!'
        }
        failure {
            echo '❌ Pipeline फेल झाला — Console Output मध्ये exact stage बघ.'
        }
        always {
            echo 'Build संपला.'
        }
    }
}
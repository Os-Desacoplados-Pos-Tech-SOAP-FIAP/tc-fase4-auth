terraform {
  required_version = ">= 1.10"

  backend "s3" {
    bucket       = "tc-fase4-tfstate-538880133939"
    key          = "auth/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "oficina-fase4"
      Environment = "prod"
      ManagedBy   = "terraform"
      Repo        = "tc-fase4-auth"
    }
  }
}

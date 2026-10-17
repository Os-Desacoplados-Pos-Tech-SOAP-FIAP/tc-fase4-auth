# Role de execução: logs + ENIs na VPC + leitura dos 2 secrets compartilhados.
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.project_name}-lambda-auth"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

data "aws_secretsmanager_secret" "jwt_secret" {
  name = local.jwt_secret_name
}

data "aws_secretsmanager_secret" "internal_token" {
  name = local.internal_token_secret_name
}

resource "aws_iam_role_policy" "secrets" {
  name = "read-auth-secrets"
  role = aws_iam_role.lambda.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = [
        data.aws_secretsmanager_secret.jwt_secret.arn,
        data.aws_secretsmanager_secret.internal_token.arn,
      ]
    }]
  })
}

# ALB interno do IngressGroup, criado pelo AWS Load Balancer Controller no deploy dos
# serviços. Só existe depois que algum Ingress do grupo foi aplicado (ordem do spec §6.6).
data "aws_lb" "app" {
  tags = {
    "elbv2.k8s.aws/cluster" = local.cluster_name
    "ingress.k8s.aws/stack" = local.ingress_group
  }
}

# SG da Lambda: egress livre (Secrets Manager via NAT e ALB interno).
resource "aws_security_group" "lambda" {
  name        = "${var.project_name}-lambda-auth"
  description = "Lambda de autenticacao por CPF"
  vpc_id      = local.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Libera a porta 80 do ALB interno (SG gerenciado em tc-fase4-infra) para a Lambda.
resource "aws_vpc_security_group_ingress_rule" "alb_from_lambda" {
  security_group_id            = local.alb_security_group_id
  from_port                    = 80
  to_port                      = 80
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.lambda.id
  description                  = "HTTP 80 a partir da Lambda de auth"
}

# Bundles gerados pelo `npm run build` (a esteira builda antes do terraform).
data "archive_file" "auth" {
  type        = "zip"
  source_dir  = "${path.module}/../dist/auth"
  output_path = "${path.module}/../dist/auth.zip"
}

data "archive_file" "authorizer" {
  type        = "zip"
  source_dir  = "${path.module}/../dist/authorizer"
  output_path = "${path.module}/../dist/authorizer.zip"
}

resource "aws_lambda_function" "auth" {
  function_name    = "${var.project_name}-auth-cpf"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.auth.output_path
  source_code_hash = data.archive_file.auth.output_base64sha256
  timeout          = 15
  memory_size      = 256

  vpc_config {
    subnet_ids         = local.private_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      OS_INTERNAL_URL                  = "http://${data.aws_lb.app.dns_name}"
      JWT_SECRET_ID                    = local.jwt_secret_name
      INTERNAL_SERVICE_TOKEN_SECRET_ID = local.internal_token_secret_name
    }
  }
}

# O authorizer só valida assinatura — fora da VPC (cold start menor).
resource "aws_lambda_function" "authorizer" {
  function_name    = "${var.project_name}-authorizer-cliente"
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs22.x"
  handler          = "index.handler"
  filename         = data.archive_file.authorizer.output_path
  source_code_hash = data.archive_file.authorizer.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      JWT_SECRET_ID = local.jwt_secret_name
    }
  }
}

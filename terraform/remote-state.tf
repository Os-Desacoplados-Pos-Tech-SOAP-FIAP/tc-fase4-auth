# A Lambda roda nas subnets privadas da VPC do cluster e chama o OS pelo ALB interno.
# Pré-requisito: apply de tc-fase4-infra (VPC, EKS, SG do ALB e segredos compartilhados).
data "terraform_remote_state" "infra" {
  backend = "s3"
  config = {
    bucket = "tc-fase4-tfstate-538880133939"
    key    = "infra/terraform.tfstate"
    region = "us-east-1"
  }
}

locals {
  vpc_id                     = data.terraform_remote_state.infra.outputs.vpc_id
  private_subnets            = data.terraform_remote_state.infra.outputs.private_subnets
  cluster_name               = data.terraform_remote_state.infra.outputs.cluster_name
  jwt_secret_name            = data.terraform_remote_state.infra.outputs.jwt_secret_name
  internal_token_secret_name = data.terraform_remote_state.infra.outputs.internal_token_secret_name
  alb_security_group_id      = data.terraform_remote_state.infra.outputs.alb_security_group_id

  # IngressGroup compartilhado pelos Ingress dos serviços (anotação alb.ingress.kubernetes.io/group.name).
  ingress_group = "oficina-fase4"
}

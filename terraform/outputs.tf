output "auth_function_arn" {
  description = "ARN da função de autenticação (integração do API Gateway)."
  value       = aws_lambda_function.auth.arn
}

output "auth_invoke_arn" {
  description = "Invoke ARN da função de autenticação."
  value       = aws_lambda_function.auth.invoke_arn
}

output "authorizer_function_arn" {
  description = "ARN do Lambda authorizer (API Gateway)."
  value       = aws_lambda_function.authorizer.arn
}

output "authorizer_invoke_arn" {
  description = "Invoke ARN do Lambda authorizer."
  value       = aws_lambda_function.authorizer.invoke_arn
}

output "auth_function_name" {
  value = aws_lambda_function.auth.function_name
}

output "authorizer_function_name" {
  value = aws_lambda_function.authorizer.function_name
}

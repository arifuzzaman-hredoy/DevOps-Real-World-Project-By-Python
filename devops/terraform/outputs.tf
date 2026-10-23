output "instance_id" {
  description = "Managed EC2 instance ID"
  value       = aws_instance.taskflow.id
}

output "public_ip" {
  description = "EC2 public IPv4 address"
  value       = aws_instance.taskflow.public_ip
}

output "public_dns" {
  description = "EC2 public DNS"
  value       = aws_instance.taskflow.public_dns
}

output "security_group_id" {
  description = "Managed Security Group ID"
  value       = aws_security_group.taskflow.id
}

output "instance_id" {
  value = aws_instance.taskflow.id
}

output "public_ip" {
  value = aws_instance.taskflow.public_ip
}

output "public_dns" {
  value = aws_instance.taskflow.public_dns
}

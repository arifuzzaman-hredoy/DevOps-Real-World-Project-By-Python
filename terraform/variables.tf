variable "aws_region" {
  description = "AWS region for the learning environment"
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  type    = string
  default = "taskflow-devops"
}

variable "instance_type" {
  description = "Choose a small eligible instance for learning; verify current Free Tier eligibility."
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "Ubuntu Server 24.04 LTS AMI ID for your chosen region. Supply this explicitly."
  type        = string
}

variable "key_name" {
  description = "Name of an existing EC2 key pair in this region. Never upload your private key to Git."
  type        = string
}

variable "your_ip_cidr" {
  description = "Your public IPv4 address with /32, e.g. 203.0.113.10/32. Restricts SSH access."
  type        = string
}

variable "app_http_cidr" {
  description = "CIDR allowed to reach HTTP. Use 0.0.0.0/0 only if you intentionally want public HTTP."
  type        = string
  default     = "0.0.0.0/0"
}

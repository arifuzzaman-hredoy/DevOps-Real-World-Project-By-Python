resource "aws_security_group" "taskflow" {
  name        = "launch-wizard-2"
  description = "launch-wizard-2 created 2026-10-20T05:59:41.004Z"
  vpc_id      = "vpc-0e7790a9ce56b842b"

  # SSH: retain existing restricted rule until SSM is verified
  ingress {
    description = "SSH access for learning lab"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Public HTTP access for Nginx
  ingress {
    description = "Public HTTP for web application"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.app_http_cidr]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    ignore_changes = [tags]
  }
}

# Allow EC2 to assume this IAM role
resource "aws_iam_role" "taskflow_ssm" {
  name = "TaskFlowEC2SSMRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# Allow the EC2 instance to communicate with Systems Manager
resource "aws_iam_role_policy_attachment" "taskflow_ssm_core" {
  role       = aws_iam_role.taskflow_ssm.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance profile through which EC2 receives the role
resource "aws_iam_instance_profile" "taskflow_ssm" {
  name = "TaskFlowEC2SSMProfile"
  role = aws_iam_role.taskflow_ssm.name
}

resource "aws_instance" "taskflow" {
  ami                    = "ami-020728ad6199d7fa0"
  instance_type          = "t3.small"
  key_name               = "devops-practice-key"
  subnet_id              = "subnet-0934528779219f7ce"
  vpc_security_group_ids = [aws_security_group.taskflow.id]

  # Attach the SSM instance profile without replacing the EC2 instance
  iam_instance_profile = aws_iam_instance_profile.taskflow_ssm.name

  lifecycle {
    ignore_changes = [
      tags,
      root_block_device,
    ]
  }
}

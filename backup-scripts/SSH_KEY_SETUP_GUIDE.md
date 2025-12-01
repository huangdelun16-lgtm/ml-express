# 🔐 服务器 SSH Key 认证配置指南

## 📋 概述

配置 SSH Key 认证后，您可以使用密钥文件直接登录服务器，无需每次输入密码，更加安全和便捷。

---

## ✅ 前提条件

- ✅ 您已经有 SSH Key（已检测到：`~/.ssh/id_rsa`）
- ✅ 服务器信息：
  - **IP地址**: 139.180.146.26
  - **用户名**: root
  - **密码**: Yv,6CPwRFKtkkK8?

---

## 🔧 配置步骤

### **Step 1: 复制您的 SSH 公钥**

您的 SSH 公钥内容：

```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDpZggu4cJ3Lkol/0NjvVtqjpoPHuau+kqFiIRT7z/vmZjbr+k3JD14tU1Q5PHx0fc9vOFI5ybOn9xvDLuRG7qhdY160fkF0+Sv0l/SSpGtLNfoyalRXXcHVE2e02TQZgF0RXv/rZeY6s2cLlnCCpezhj7g1ghdJYaiVEn/jdxaJ7GjLQ9ZscQ9AvccrDt9wn1FykUeHFPZXdIB9lEErJuGrcFb3nZMUjOjpyxJvmiV7Lf9845ZJLUVzWTmk6y8ecKRSQ/5y2wAKMKiFOEDMUKW2OFZhVNy+ZikKdZsno6+KtL1tPePDCnV4Za+ylBzNv2Q6A0HIGetM/F0C6YrwH+RmvBiM0khcm0siDOFm1naVqsGyKJ93ns0Xqa8GYi4UVOyucYEjLpi0sEr7Ixt/KMFexBvBV0alrhV8CIDSHGNjWWLDLbAihuu1Fh80tlHoBEBF/lAyUQTNGxXt3wtjAbv0D2Y3F4umZY3fxFoe9WOr//pWFcS57VTruRyNIVC0Oq49A6GylNh9zTkYRZa4ag4gn/ybtxoNL4PlynduqCgnWhXcl4Wj/E/+4xf2LdLNz/KL+nw+S45BpmESO/aM9aC6NburtMzEh18KkY84VPG8tlrQFxkYyDxJHYPqV7lnDII4WQ4B05janzqD7i9cFlzalBP53tBFLMTHlTZDWrAeQ== aungmyatthu259369349@gmail.com
```

**方法一：使用命令行复制（推荐）**

```bash
# macOS/Linux
cat ~/.ssh/id_rsa.pub | pbcopy

# 或者直接显示
cat ~/.ssh/id_rsa.pub
```

**方法二：手动复制**

打开文件 `~/.ssh/id_rsa.pub`，复制全部内容。

---

### **Step 2: 连接到服务器**

使用密码登录服务器：

```bash
ssh root@139.180.146.26
# 输入密码: Yv,6CPwRFKtkkK8?
```

---

### **Step 3: 在服务器上配置 SSH Key**

连接成功后，在服务器上执行以下命令：

```bash
# 1. 确保 .ssh 目录存在
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 2. 将您的公钥添加到 authorized_keys 文件
# 方法一：使用 echo 命令（推荐）
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDpZggu4cJ3Lkol/0NjvVtqjpoPHuau+kqFiIRT7z/vmZjbr+k3JD14tU1Q5PHx0fc9vOFI5ybOn9xvDLuRG7qhdY160fkF0+Sv0l/SSpGtLNfoyalRXXcHVE2e02TQZgF0RXv/rZeY6s2cLlnCCpezhj7g1ghdJYaiVEn/jdxaJ7GjLQ9ZscQ9AvccrDt9wn1FykUeHFPZXdIB9lEErJuGrcFb3nZMUjOjpyxJvmiV7Lf9845ZJLUVzWTmk6y8ecKRSQ/5y2wAKMKiFOEDMUKW2OFZhVNy+ZikKdZsno6+KtL1tPePDCnV4Za+ylBzNv2Q6A0HIGetM/F0C6YrwH+RmvBiM0khcm0siDOFm1naVqsGyKJ93ns0Xqa8GYi4UVOyucYEjLpi0sEr7Ixt/KMFexBvBV0alrhV8CIDSHGNjWWLDLbAihuu1Fh80tlHoBEBF/lAyUQTNGxXt3wtjAbv0D2Y3F4umZY3fxFoe9WOr//pWFcS57VTruRyNIVC0Oq49A6GylNh9zTkYRZa4ag4gn/ybtxoNL4PlynduqCgnWhXcl4Wj/E/+4xf2LdLNz/KL+nw+S45BpmESO/aM9aC6NburtMzEh18KkY84VPG8tlrQFxkYyDxJHYPqV7lnDII4WQ4B05janzqD7i9cFlzalBP53tBFLMTHlTZDWrAeQ== aungmyatthu259369349@gmail.com" >> ~/.ssh/authorized_keys

# 方法二：使用 nano 编辑器（如果方法一失败）
nano ~/.ssh/authorized_keys
# 粘贴您的公钥，保存并退出（Ctrl+X, Y, Enter）

# 3. 设置正确的权限
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# 4. 验证配置
cat ~/.ssh/authorized_keys
```

---

### **Step 4: 测试 SSH Key 认证**

退出服务器，然后使用 SSH Key 登录：

```bash
# 退出服务器
exit

# 使用 SSH Key 登录（应该不需要输入密码）
ssh root@139.180.146.26
```

**如果成功**：您应该可以直接登录，无需输入密码！

**如果失败**：请检查：
1. 公钥是否正确复制到服务器
2. 文件权限是否正确（`~/.ssh` 应该是 700，`authorized_keys` 应该是 600）
3. SSH 服务是否正常运行

---

## 🔒 安全建议

### **可选：禁用密码登录（仅允许 SSH Key）**

⚠️ **警告**：只有在确认 SSH Key 认证正常工作后，才能执行此步骤！

```bash
# 1. 编辑 SSH 配置文件
nano /etc/ssh/sshd_config

# 2. 找到并修改以下配置：
# PasswordAuthentication no
# PubkeyAuthentication yes

# 3. 重启 SSH 服务
systemctl restart ssh

# 4. 测试连接（不要关闭当前会话！）
# 打开新终端测试，确认可以连接后再关闭当前会话
```

---

## 📝 使用 SSH Key 连接

配置完成后，您可以使用以下方式连接：

### **方法一：直接连接**

```bash
ssh root@139.180.146.26
```

### **方法二：指定密钥文件（如果需要）**

```bash
ssh -i ~/.ssh/id_rsa root@139.180.146.26
```

### **方法三：配置 SSH Config（推荐）**

创建或编辑 `~/.ssh/config` 文件：

```bash
nano ~/.ssh/config
```

添加以下内容：

```
Host ml-express-server
    HostName 139.180.146.26
    User root
    IdentityFile ~/.ssh/id_rsa
    Port 22
```

保存后，您可以使用别名连接：

```bash
ssh ml-express-server
```

---

## 🐛 故障排除

### **问题1：仍然要求输入密码**

**解决方案**：
1. 检查服务器上的 `~/.ssh/authorized_keys` 文件权限：
   ```bash
   chmod 600 ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   ```

2. 检查 SSH 服务配置：
   ```bash
   # 在服务器上执行
   grep -E "PubkeyAuthentication|PasswordAuthentication" /etc/ssh/sshd_config
   ```
   应该显示：
   ```
   PubkeyAuthentication yes
   PasswordAuthentication yes  # 或 no（如果已禁用密码）
   ```

3. 检查 SSH 日志：
   ```bash
   # 在服务器上执行
   tail -f /var/log/auth.log
   # 然后尝试连接，查看错误信息
   ```

### **问题2：权限被拒绝 (Permission denied)**

**解决方案**：
```bash
# 在服务器上执行
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chown root:root ~/.ssh
chown root:root ~/.ssh/authorized_keys
```

### **问题3：连接超时**

**解决方案**：
1. 检查服务器是否运行：
   ```bash
   ping 139.180.146.26
   ```

2. 检查防火墙设置：
   ```bash
   # 在服务器上执行
   ufw status
   # 确保端口 22 开放
   ```

---

## ✅ 验证配置成功

配置成功后，您应该能够：

1. ✅ 使用 `ssh root@139.180.146.26` 直接登录，无需输入密码
2. ✅ 看到服务器欢迎信息
3. ✅ 可以正常执行命令

---

## 📚 相关文档

- [服务器手动连接指南](./manual-connection-guide.md)
- [SSH 官方文档](https://www.openssh.com/manual.html)

---

**配置完成后，建议保存此文档，以便将来参考！**


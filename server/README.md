# Deploy y-webtransport to Ubuntu Server

## Prerequisites
- Ubuntu 20.04+ server
- Domain: webtransport.awaken-labs.com pointing to server IP
- SSH access

---

## Step 1: Add DNS Record

In your DNS provider, add:
```
Type: A
Name: webtransport
Value: YOUR_SERVER_IP
```

Wait 5 minutes, then verify:
```bash
ping webtransport.awaken-labs.com
```

---

## Step 2: SSH and Install Dependencies

```bash
ssh your-user@YOUR_SERVER_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Go
sudo apt install -y golang git

# Verify Go
go version
```

---

## Step 3: Open Firewall Ports

```bash
# Allow required ports
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 4433/udp  # WebTransport (QUIC)
sudo ufw allow 80/tcp    # Let's Encrypt verification

# Enable firewall if not enabled
sudo ufw enable

# Verify
sudo ufw status
```

---

## Step 4: Get Let's Encrypt Certificate

```bash
# Install certbot
sudo apt install -y certbot

# Get certificate (temporarily stop anything on port 80)
sudo certbot certonly --standalone -d webtransport.awaken-labs.com

# Certificates saved to:
# /etc/letsencrypt/live/webtransport.awaken-labs.com/fullchain.pem
# /etc/letsencrypt/live/webtransport.awaken-labs.com/privkey.pem
```

---

## Step 5: Upload Server Code

### Option A: From your Mac
```bash
# Create deploy directory on server
ssh your-user@YOUR_SERVER_IP "sudo mkdir -p /opt/y-webtransport && sudo chown \$USER:\$USER /opt/y-webtransport"

# Upload files
scp deploy/main.go deploy/go.mod your-user@YOUR_SERVER_IP:/opt/y-webtransport/
scp deploy/y-webtransport.service your-user@YOUR_SERVER_IP:/tmp/
```

### Option B: Copy-paste on server
SSH in and create files manually using nano/vim.

---

## Step 6: Build the Server

```bash
ssh your-user@YOUR_SERVER_IP

cd /opt/y-webtransport

# Download dependencies
go mod tidy

# Build
go build -o server .

# Test run (Ctrl+C to stop)
sudo ./server
```

You should see:
```
Starting WebTransport server on :4433
Starting HTTPS server on :443
```

---

## Step 7: Install as System Service

```bash
# Copy service file
sudo cp /tmp/y-webtransport.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start
sudo systemctl enable y-webtransport

# Start service
sudo systemctl start y-webtransport

# Check status
sudo systemctl status y-webtransport
```

---

## Step 8: Verify It Works

### Health check
```bash
curl https://webtransport.awaken-labs.com/health
# Should return: {"status":"ok","webtransport":"wss://webtransport.awaken-labs.com:4433"}
```

### From your Mac browser
Open the test page and update URL to:
```javascript
const url = 'https://webtransport.awaken-labs.com:4433/collab/test-room';
```

Remove the `serverCertificateHashes` option (not needed with real cert).

---

## Troubleshooting

### Check logs
```bash
sudo journalctl -u y-webtransport -f
```

### Port already in use
```bash
sudo lsof -i:443
sudo lsof -i:4433
```

### Certificate issues
```bash
sudo certbot certificates
```

### Firewall blocking
```bash
sudo ufw status
# Make sure 4433/udp is allowed
```

---

## Auto-renew Certificate

```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
sudo crontab -e
# Add: 0 3 * * * certbot renew --post-hook "systemctl restart y-webtransport"
```


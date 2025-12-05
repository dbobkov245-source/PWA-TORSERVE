#!/usr/bin/expect -f

set timeout 900
set ip "192.168.1.88"
set port 8022
set user "u0_a203"
set password "qwer"

# 1. Install extra build tools
# 2. Force rebuild of node-datachannel
set cmd "pkg install -y ninja pkg-config binutils rust && cd ~/pwa-torserve && npm install node-datachannel --build-from-source"

puts "Attempting to fix WebTorrent engine on $ip..."
spawn ssh -p $port -o StrictHostKeyChecking=no $user@$ip $cmd

expect {
    "password:" {
        send "$password\r"
    }
    timeout {
        puts "Timeout waiting for password prompt"
        exit 1
    }
}

expect {
    "added" {
        puts "\nInstallation successful!"
    }
    "npm error" {
        puts "\nInstallation failed!"
    }
    eof {
        puts "\nProcess finished."
    }
    timeout {
        puts "\nTimeout waiting for build (it takes a long time)"
    }
}

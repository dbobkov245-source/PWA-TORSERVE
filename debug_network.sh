#!/usr/bin/expect -f

set timeout 20
set ip "192.168.1.88"
set port 8022
set user "u0_a203"
set password "qwer"

spawn ssh -p $port -o StrictHostKeyChecking=no $user@$ip "echo '---PROCESS---' && pm2 status && echo '---NETSTAT---' && ss -tuln | grep 3000 && echo '---CURL---' && curl -I http://localhost:3000 && echo '---IP---' && ifconfig"
expect {
    "password:" {
        send "$password\r"
    }
    timeout {
        puts "Timeout waiting for password prompt"
        exit 1
    }
}
expect eof

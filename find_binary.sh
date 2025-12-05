#!/usr/bin/expect -f

set timeout 20
set ip "192.168.1.88"
set port 8022
set user "u0_a203"
set password "qwer"

spawn ssh -p $port -o StrictHostKeyChecking=no $user@$ip "find ~/pwa-torserve/node_modules -name node_datachannel.node"
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

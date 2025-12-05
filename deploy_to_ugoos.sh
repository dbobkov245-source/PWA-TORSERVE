#!/usr/bin/expect -f

set timeout 20
set ip "192.168.1.88"
set port 8022
set user "u0_a203"
set password "qwer"
set dest_base "~/pwa-torserve"

# Function to copy file
proc copy_file {src dest ip port user password} {
    puts "Copying $src to $dest..."
    spawn scp -P $port -o StrictHostKeyChecking=no $src $user@$ip:$dest
    expect {
        "password:" {
            send "$password\r"
        }
        timeout {
            puts "Timeout waiting for password prompt"
            exit 1
        }
        eof {
            # Connection might have been closed or success without password (unlikely)
        }
    }
    expect eof
}

# Copy package.json
copy_file "package.json" "$dest_base/" $ip $port $user $password

# Copy setup script
copy_file "setup.sh" "$dest_base/" $ip $port $user $password

# Copy server files
copy_file "server/index.js" "$dest_base/server/" $ip $port $user $password
copy_file "server/torrent.js" "$dest_base/server/" $ip $port $user $password
copy_file "server/db.js" "$dest_base/server/" $ip $port $user $password
copy_file "server/watchdog.js" "$dest_base/server/" $ip $port $user $password

# Copy client dist files
puts "Copying client/dist directory..."
spawn scp -P $port -r -o StrictHostKeyChecking=no client/dist $user@$ip:$dest_base/client/
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

puts "Deployment script finished."

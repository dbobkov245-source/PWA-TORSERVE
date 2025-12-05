#!/usr/bin/expect -f

set timeout 30
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
            # Connection might have been closed or success without password
        }
    }
    expect eof
}

# Function to run command
proc run_command {cmd ip port user password} {
    puts "Running: $cmd"
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
    expect eof
}

# Copy setup script
copy_file "termux_boot_setup.sh" "$dest_base/" $ip $port $user $password

# Run setup script
run_command "sh $dest_base/termux_boot_setup.sh" $ip $port $user $password

puts "Remote setup finished."

# https://www.pugetsystems.com/labs/hpc/Quad-RTX3090-GPU-Power-Limiting-with-Systemd-and-Nvidia-smi-1983/


# keep nvidia driver loaded
sudo nvidia-smi --persistence-mode=1


# copy script
sudo cp "./nv-power-limit.sh" "/usr/local/sbin/nv-power-limit.sh"
# root has read, write, and execute permissions and "group" and "other" have read permission.
# only root should modify or run this script!
sudo chmod 744 "/usr/local/sbin/nv-power-limit.sh"


# copy service
sudo mkdir "/usr/local/etc/systemd"
sudo cp "./nv-power-limit.service" "/usr/local/etc/systemd/nv-power-limit.service"
# Set permissions to 644 i.e. root has read and write permission and group and other have read permission.
sudo chmod 644 "/usr/local/etc/systemd/nv-power-limit.service"


# With the unit service file in place we need to link it into the /etc/systemd/system directory so systemd can find it.
sudo ln -s "/usr/local/etc/systemd/nv-power-limit.service" "/etc/systemd/system/nv-power-limit.service"
# The last thing to do is to "enable" the service so that it will start at boot time.
sudo systemctl enable nv-power-limit.service


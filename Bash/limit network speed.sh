
# get hardware interface with ifconfig
hw_interface=wlp7s0
rate=6mbps
burst=256kb

# limit network speed of interface
#sudo tc qdisc add dev "${hw_interface}" root tbf rate "${rate}" burst "${burst}" latency 10ms

# list tc rules
#tc qdisc list

# remove tc rules
#sudo tc qdisc del dev "${hw_interface}" root

# V2
tc filter add dev "${hw_interface}" protocol ip parent ffff: prio 50 u32 match ip src 0.0.0.0/0 police rate "${rate}" burst "${burst}" drop flowid :1 
#tc filter del dev "${hw_interface}" parent ffff: prio 50


#!/bin/bash
#
#
#
#

echo "Spinning-up a container with Servoy $SVY_VERSION"
/var/lib/jenkins/workspace/svyMicroSamples/jenkins-build/kubernetes/api-calls/dev-app-pod.sh -a developerapp -n demo -l developerapp -c developerapp -i servoy/alpine-appserver-developer-nfs:$SVY_VERSION-jar-included
sleep 60
echo "Scanning for dev-app Pod IP.."
devapppod=$(sudo kubectl get pods -n demo -o wide | grep developerapp | awk '{print $6}')
echo "dev-app Pod IP: $devapppod"
echo "Mounting NFS share from dev-app pod to local /usr/local/servoy"
sudo mount -t nfs -o nolock -o rsize=8192 -o wsize=8192 -o sync $devapppod:/usr/local/servoy /usr/local/servoy


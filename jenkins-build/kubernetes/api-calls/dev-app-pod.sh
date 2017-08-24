#!/bin/bash

usage()
{
cat << EOF
usage: $0 options

This script creates a Kubernestes Pod in specified namespace.

OPTIONS:
   -h      Show this message
   -a      Pod name
   -n      Namespace
   -l      Application label
   -c      Containers name
   -i      DockerHub image
EOF
}

POD_NAME=
K8S_NAMESPACE=
APP_LABEL=
CONTAINER_NAME=
SOURCE_IMAGE=

while getopts “h:a:n:l:c:i:” OPTION
do
  case $OPTION in
    h) usage; exit 1;;
    a) POD_NAME=$OPTARG;;
    n) K8S_NAMESPACE=$OPTARG;;
    l) APP_LABEL=$OPTARG;;
    c) CONTAINER_NAME=$OPTARG;;
    i) SOURCE_IMAGE=$OPTARG;;
    ?) usage; exit;;
  esac
done

if [[ -z $POD_NAME ]] || [[ -z $K8S_NAMESPACE ]] || [[ -z $APP_LABEL ]] || [[ -z $CONTAINER_NAME ]] || [[ -z $SOURCE_IMAGE ]]
  then
    usage
    exit 1
fi

POD_TMP_YAML=$(mktemp)
cp /var/lib/jenkins/workspace/svyMicroSamples/jenkins-build/kubernetes/api-calls/templates/dev-app-pod.yaml $POD_TMP_YAML
sed -i "s/POD_NAME/$POD_NAME/g" $POD_TMP_YAML
sed -i "s/K8S_NAMESPACE/$K8S_NAMESPACE/g" $POD_TMP_YAML
sed -i "s/APP_LABEL/$APP_LABEL/g" $POD_TMP_YAML
sed -i "s/CONTAINER_NAME/$CONTAINER_NAME/g" $POD_TMP_YAML
sed -i "s#SOURCE_IMAGE#$SOURCE_IMAGE#g" $POD_TMP_YAML

kubectl create -f $POD_TMP_YAML

rm -f $POD_TMP_YAML

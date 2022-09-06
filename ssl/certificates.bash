#!/bin/bash
# Generate root CA, Traefik and one client certificate
# src: https://jamielinux.com/docs/openssl-certificate-authority/index.html

# TODO: Rewrite in commanderjs (https://github.com/tj/commander.js/)

function help() {
    echo -e "invalid number of arguments to the command"
    echo -e "certificates.bash [generate | clean]"
    echo -e "\t generate \t Generates the required certificates. \
Replace the two lines of password file with your passwords. \
The first line is the password to decrypt the private certificates. \
The second line is the password the password used to create \
private certificates."
    echo -e "\t clean \t\t Cleans the certificates and the CA-related data."
}

if [ $# != 1 ]
then
    help
    exit 1
fi

function generate() {
    # generate Root CA private key
    echo -e " Generating root CA private certificate"
    echo -e "---------------------------------"
    mkdir private certs
    openssl genrsa -aes256 -passout file:password -out private/ca.key.pem 4096     #give password and remember it. For now, it's "dtaas"
    chmod 400 private/ca.key.pem

    echo -e "\n\n\n Generating root CA public certificate"
    echo -e "------------------------------------"
    # generate Root CA public key
    openssl req -config ./ssl.conf -passin file:password -key private/ca.key.pem -new -x509 -days 7300 -sha256 -extensions v3_ca -out certs/ca.cert.pem

    # check the certificate
    openssl x509 -noout -text -in certs/ca.cert.pem

    echo 1000 > crlnumber

    # generate server key
    mkdir certs/services private/services
    echo -e "\n\n\n Generating Traefik gateway server private certificate"
    echo -e "-----------------------------------------------------"
    openssl genrsa -aes256 -passout file:password -out private/services/traefik.key.pem 4096      #give password and remember it. For now, it's "dtaas"
    chmod 400 private/services/traefik.key.pem

    # create server certificate signing request
    echo -e "\n\n\n Generating Traefik gateway server public certificate signing request"
    echo -e "-----------------------------------------------------------------"
    openssl req -config ./ssl.conf -passin file:password -key private/services/traefik.key.pem -new -sha256 -out certs/services/traefik.csr.pem

    # sign the certificate using root CA
    mkdir newcerts
    touch index.txt
    echo 1000 > serial
    echo -e "\n\n\n Signing public certificate of Traefik gateway server by the root CA"
    echo -e "-----------------------------------------------------------------"
    openssl ca -batch -config ./ssl.conf -passin file:password -extensions server_cert -in certs/services/traefik.csr.pem -out certs/services/traefik.cert.pem
    # Traefik can't decrypt private keys with passwords.
    # Remove passwords before using the privay keys in Traefik
    openssl rsa -passin file:password -in private/services/traefik.key.pem -out private/services/traefik-nopasswd.key.pem      #if you press enter, the password is removed

    # generate client key
    echo -e "\n\n\n Generating client private certificate"
    echo -e "--------------------------------------"
    openssl genrsa -aes256 -passout file:password -out private/client.key.pem 4096      #give password and remember it. For now, it's "dtaas"
    chmod 400 private/client.key.pem

    # create client certificate signing request
    echo -e "\n\n\n Generating client certificate signing request"
    echo -e "---------------------------------------------"
    sed 's/commonName              = localhost$/commonName              = client/' ssl.conf  > client.conf
    mv client.conf ssl.conf
    openssl req -config ./ssl.conf -passin file:password  -key private/client.key.pem -new -sha256 -out certs/client.csr.pem

    # sign the certificate using root CA
    echo -e "\n\n\n Signing public certificate of client by the root CA"
    echo -e "----------------------------------------------------"
    openssl ca -batch -config ssl.conf -passin file:password -extensions usr_cert -in certs/client.csr.pem -out certs/client.cert.pem

    # mTLS with browser requires client certificate in PKCS12 format.
    echo -e "\n\n\n Creating PKCS12 format certificate for client. The pkcs12 certificate will not have any password."
    echo -e "---------------------------------------------"
    cat private/client.key.pem certs/client.cert.pem certs/ca.cert.pem | openssl pkcs12  -passin file:password  -password file:password -export -out private/client.key.p12

    # restore the SSL config
    sed 's/commonName              = client$/commonName              = localhost/' ssl.conf  > server.conf
    mv server.conf ssl.conf

    # check the certificates
    echo -e "\n\n\n Check the public certificates"
    echo -e "-------------------------------"
    echo -e "\n Root CA public certificate"
    echo -e "-----------------------------"
    openssl x509 -noout -text -in certs/ca.cert.pem

    echo -e "\n\n\n Traefik server public certificate"
    echo -e "---------------------------------"
    openssl x509 -noout -text -in certs/services/traefik.cert.pem

    echo -e "\n\n\n Client public certificate"
    echo -e "---------------------------------"
    openssl x509 -noout -text -in certs/services/traefik.cert.pem

    echo -e "\n\n\n Advice"
    echo -e "----------"
    echo "Copy the following certificates to Traefik"
    echo -e "ca.cert.pem, traefik.cert.pem, traefik-nopasswd.key.pem"

    echo -e "\n\nGive client.key.p12 certificate to the client. \
See the second line of password file for the client certificate password"

}

function clean() {
    rm -rf certs crlnumber newcerts private
    rm index.txt*
    rm serial*
}


case $1 in
    generate)
        generate
        ;;
    clean)
        clean
        ;;
    *)
        help
        ;;
esac

# Generate SSL Certificates for DTaaS application

Set the required passwords for private certificates in the **password** file. The first line will be used for the input password and the next line for the output password.

## Using the shell script

1. To generate the certificates, use `./certificate.bash generate`.
1. To clean up the directory for clean slate, use `./certificate.bash clean`

## Add Self-signed SSL certificate to Traefik Gateway Server

Copy:

1) certs/ca.cert.pem
1) certs/services/traefik.cert.pem
1) private/services/traefik-nopasswd.key.pem

to **servers/gateway/certs** directory.

## Add Self-signed SSL certificate to Firefox

1) Take private/client.key.p12 certificate for the next steps
1) open firefox browser in regular, non-private mode.
1) open preferences (about:preferences)
1) search for "certificates" --> Certificate Manager --> 
    1) Authorities --> import ca.cert.pem and checkmark
         Trust this CA to identify websites
         Trust this CA to identify email users

    1) Your Certificates --> Import --> Add PKCS12 format client certificate (client.key.p12)
            The password for this certificate is "dtaas"

    It's important to add the certificates inthe same order. Otherwise, certificate errors are shown.

1) Setting default client SSL certificate for mTLS  
    a) Open an empty tab and type `about:config`  
    b) Accept the risk and continue  
    c) In the search bar, type: `security.default_personal_cert = Select Automatically`

### References

1. https://kb.mit.edu/confluence/display/istcontrib/Default+Certificate+Selection+in+Firefox
1. https://unix.stackexchange.com/questions/644176/how-to-permanently-add-self-signed-certificate-in-firefox
1. https://www.jscape.com/blog/firefox-client-certificate

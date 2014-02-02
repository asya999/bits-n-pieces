from WebService import WebServiceClient
from WebService import WSOpts
from ConfigService import ConfigServiceClient
import sys
import logging

# create a scan user account, set password to 'irrelevant', lock account, add to appropriate group
# send email notifying them how to log in and set their password.

def main():

    wsOpts = WSOpts()

    parser = wsOpts.get_common_opts()

    parser.add_option("--username",  dest="username",  help="Username")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('username',)):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options);

    logging.debug("Creating LDAP account " + options.username)
    success = configServiceClient.create_user(options.username,role=None, ldap=True)
    successConvert=False
    if not success:
        # assume the user exists as local user and switch to LDAP
        successConvert=configServiceClient.convert_to_ldap_user(options.username)
        if not successConvert:
           print "Couldn't create and couldn't convert, sorry!"
           sys.exit(1)
    subject = "Your Coverity account has been created"
    userDO = configServiceClient.get_user(options.username)
    url = "http://coverity.mongodb.com"
    if successConvert: subject = "Your Coverity account has been converted to Crowd/Jira"
    text = """
       <html><pre>
          Dear %s,
          \n
          An account has been created for you at MongoDB Coverity Instance.
          Your username is %s, same as your Crowd/Jira username.
          You can go to <a href=%s>%s</a> to securely log in using your Crowd/Jira password.
          \n
          Your Coverity Admin Team
          \n
       </pre></html>
    """
    name = str(options.username)
    body = text % (name, options.username, url, url)
    try:
        configServiceClient.send_notifications(options.username, subject, body)
    except Exception, err:
        print "Error sending user notification", str(err)
        sys.exit(1)
    print "Created user %s, sent notification" % (options.username)

if __name__ == '__main__':
    main()

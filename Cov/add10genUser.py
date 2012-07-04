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
    parser.add_option("--first",  dest="first",  help="First name")
    parser.add_option("--last",  dest="last",  help="Last Name")
    parser.add_option("--email", dest="email",  help="Email")
    parser.add_option("--group", dest="group",  help="Existing Group to add user to")

    (options, args) = parser.parse_args()
    wsOpts.setLogging(options.debug)

    if wsOpts.checkRequiredMissing(options, ('username','email','group')):
        parser.print_help()
        sys.exit(-1)

    configServiceClient = ConfigServiceClient(options);

    logging.debug("Creating local account " + options.username)
    success = configServiceClient.create_user(options.username,options.first,options.last,options.email,'Administrators','xxxxxx',role=None, locked=True)
    if not success:
        print "Error!"
        sys.exit(1)
    subject = "Your Coverity account has been created"
    text = """
       <html><pre>
          Dear %s,
          \n
          An account has been created for you at 10gen Coverity Instance.
          Your username is %s
          You have been added to %s group
          Please go to %s
          and click on "Forgot Password?" link - this will allow you to set your password.
          \n
          Asya
          \n
       </pre></html>
    """
    name = str(options.username)
    if options.first:
        name = str(options.first)
    url = configServiceClient.create_url()
    body = text % (name,options.username, options.group, url)
    try:
        configServiceClient.send_notifications(options.username, subject, body)
    except Exception, err:
        print "Error sending user notification", str(err)
        sys.exit(1)
    print "Created user %s, added them to group %s, send notification" % (options.username, options.group)

if __name__ == '__main__':
    main()

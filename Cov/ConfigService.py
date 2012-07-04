from WebService import WebServiceClient
import logging
import re

# This class implements Web Services methods for Configuration
# for dealing with projects, streams, snapshots, etc.
# As of v4 in 5.5 it was combined with Administration service and now
# has methods to deal with users, roles, groups, etc.
class ConfigServiceClient(WebServiceClient):
    def __init__(self, opt):
        WebServiceClient.__init__(self, 'configuration', opt.host, opt.port, opt.user, opt.password, opt.secure)

    def get_checker_prop(self, checker, subcat, domain, attribute=None):
        checkerPropFSDO = self.client.factory.create('checkerPropertyFilterSpecDataObj')
        checkerPropFSDO.checkerNameList = [checker]
        checkerPropFSDO.subcategoryList = [subcat]
        checkerPropFSDO.domainList = [domain]
        logging.debug(checkerPropFSDO)
        chPropDO = self.client.service.getCheckerProperties(checkerPropFSDO)
        logging.debug(chPropDO)
        if len(chPropDO) == 0:
            logging.error("No category name/description for checker "+checker)
            return None
        if attribute:
            return getattr(chPropDO[0],attribute)
        else:
            return chPropDO[0]

    def get_checker_properties(self, checker, subcat, domain):
        return self.get_checker_prop(checker, subcat, domain)

    def get_checker_impact(self, checker, subcat, domain):
        return self.get_checker_prop(checker, subcat, domain, 'impact')

    def get_checker_category_description(self, checker, subcat, domain):
        return self.get_checker_prop(checker, subcat, domain, 'categoryDescription')

    def get_checker_category(self, checker, subcat, domain):
        return self.get_checker_prop(checker, subcat, domain, 'coverityCategory')

    def get_checker_CWE(self, checker, subcat, domain):
        return self.get_checker_prop(checker, subcat, domain, 'cweCategory')

    def get_checkers_by_domain(self, domain, full=None):
        """
        Return the list of checkerPropertyDataObj if full is set
                   list of checkerSubcategoryId if it's None
        """
        checkerPropFSDO = self.client.factory.create('checkerPropertyFilterSpecDataObj')
        checkerPropFSDO.domainList = [domain]
        chPropDO = self.client.service.getCheckerProperties(checkerPropFSDO)
        if full:
            return chPropDO
        else:
            return [c.checkerSubcategoryId for c in chPropDO]

    def get_checkers_by_impact(self, impact, full=None):
        """
        Return the list of checkerPropertyDataObj if full is set
                   list of checkerSubcategoryId if it's None
        """
        checkerPropFSDO = self.client.factory.create('checkerPropertyFilterSpecDataObj')
        checkerPropFSDO.impactList = [impact]
        chPropDO = self.client.service.getCheckerProperties(checkerPropFSDO)
        if full:
            return chPropDO
        else:
            return [c.checkerSubcategoryId for c in chPropDO]

    def get_checkers_by_cwe(self, cwe):
        checkerPropFSDO = self.client.factory.create('checkerPropertyFilterSpecDataObj')
        checkerPropFSDO.cweCategoryList = [cwe]
        chPropDO = self.client.service.getCheckerProperties(checkerPropFSDO)
        return [c.checkerSubcategoryId for c in chPropDO]

    def print_system_config(self):
        confDO = self.client.service.getSystemConfig()
        logging.debug(confDO)
        logging.info("DB port is " + str(confDO.maindbUrl.split(':')[3].split('/')[0]))
        logging.info("Commit port is   " + str(confDO.commitPort))

    def get_component_maps(self,name=None):
        # getting all component maps
        cmFDO = self.client.factory.create('componentMapFilterSpecDataObj')
        cmFDO.namePattern = '*'
        if name:
            cmFDO.namePattern = name
        return self.client.service.getComponentMaps(cmFDO)

    # get component DOs for given component name list, project or stream
    def get_components(self, projectname = None, streamname = None):
        components = []
        cms = []
        streamDOs = self.get_streamDO(projectname, streamname)
        cmFDO = self.client.factory.create('componentMapFilterSpecDataObj')
        for str in streamDOs:
            cmFDO.namePattern = str.componentMapId.name
            cm = self.client.service.getComponentMaps(cmFDO)
            if str.componentMapId.name not in cms:
                cms.append(str.componentMapId.name)
                #for i in range(0, len(cm[0].components)):
                #  cm[0].components[i].componentId.name=str.componentMapId.name+"."+cm[0].components[i].componentId.name
                components.extend(cm[0].components)
        return list(set(components))

    def get_components_with_subscribers(self, projectname = None, streamname = None):
        components = self.get_components(projectname, streamname)
        return [c for c in components if len(getattr(c,'subscribers',[]))> 0]

    # get component by name
    def get_component(self, component_name):
        compFilter = self.client.factory.create('componentIdDataObj')
        compFilter.name = component_name
        return self.client.service.getComponent(compFilter)

    # this is for component maps so we need the source stream
    def get_streamDO(self, projectname = None, streamname = None, stream_type = None):
        # always ignoring stream_type starting 5.5
        if not projectname:
            StreamFilterSpecDO = self.client.factory.create('streamFilterSpecDataObj')
            if streamname:
                StreamFilterSpecDO.namePattern = streamname
            return self.client.service.getStreams(StreamFilterSpecDO)
        if projectname:
            ProjFilterSpecDO = self.client.factory.create('projectFilterSpecDataObj')
            ProjFilterSpecDO.namePattern = projectname
            p = self.client.service.getProjects(ProjFilterSpecDO)
            return [s for s in self.get_pstreams(p[0])]

    # private helper method, all should call get_streams
    # get streamIdDO by name for type (STATIC by default)
    def get_stream(self, streamname = None, stream_type = None):
        # ignore stream type starting 5.5
        streamIdDOs = []
        StreamFilterSpecDO = self.client.factory.create('streamFilterSpecDataObj')
        if streamname:
            StreamFilterSpecDO.namePattern = streamname
        streamDOs = self.client.service.getStreams(StreamFilterSpecDO)
        for s in streamDOs:
            streamIdDOs.append(s.id)
        return streamIdDOs

    def get_projects(self, projectname = None, streamname = None):
        projectFilterSpecDO = self.client.factory.create('projectFilterSpecDataObj')
        if projectname:
            projectFilterSpecDO.namePattern = projectname
        projDOs = self.client.service.getProjects(projectFilterSpecDO)
        # if no stream is specified
        if not streamname:
            return projDOs
        else:     # if streamname - if they don't match oh well
            #not using pstreams here because we want primary project for stream
            #and p.streams could be none
            #return [p for p in projDOs if streamname in projDOs.streams.id.name]
            for p in projDOs:
                s = getattr(p,'streams',[])
                if streamname in [st.id.name for st in s]:
                    return [p,]
            # if no match for streamname
            return []

    # private helper method, all should call get_streams
    def get_streams_for_project(self, projectname, stream_type = None):
        streamDOs = []
        projectDO = self.get_projects(projectname)
        for project in projectDO:
            streamDOs.extend(self.get_pstreams(project))
        return streamDOs

    # private helper method, all should call get_streams
    def get_streamIds_for_project(self, projectname, stream_type = None):
        streamIdDOs = []
        projectDO = self.get_projects(projectname)
        for project in projectDO:
            for s in self.get_pstreams(project):
                streamIdDOs.append(s.id)
        return streamIdDOs

    # get streamIdDO list for project or stream, all if none passed
    def get_streams(self, projectname = None, streamname = None):
        if projectname:
            return self.get_streamIds_for_project(projectname)
        else:
            return self.get_stream(streamname)

    # given project name, return its ID, given no name, return
    def get_project_id(self, projectname = None):
        projectDO = self.get_projects(projectname)
        if projectname and len(projectDO) == 1:
            return projectDO[0].projectKey
        else:
            return None

    # return project name, project id pairs as a list of tuples
    def get_project_ids(self):
        projList = self.get_projects()
        projectKeyPairs = [ (p.id.name, p.projectKey) for p in projList ]
        return projectKeyPairs

    def get_last_snapshot(self, streamIdDO = None):
        """
            return last snapshotIdDO for streamIdDO
        """
        snaps = []
        if not streamIdDO:
            streamIdDOs = self.get_streams()
        else:
            streamIdDOs = [streamIdDO, ]
        for s in streamIdDOs:
            snaps.extend(self.get_snapshots_by_stream_as_list(s))
        if len(snaps) == 0:
            return None
        return self.get_snapshot( max(snaps))

    def get_next_to_last_snapshot(self, streamIdDO = None):
        """
            return next to last snapshotIdDO for streamIdDO
        """
        snaps = []
        if not streamIdDO:
            streamIdDOs = self.get_streams()
        else:
            streamIdDOs = [streamIdDO, ]
        for s in streamIdDOs:
            snaps.extend(self.get_snapshots_by_stream_as_list(s))
        if len(snaps) < 2:
            return None
        maxsnap = max(snaps)
        snaps.remove(maxsnap)
        return self.get_snapshot( max(snaps))

    def get_snapshot_by_date(self, odate, streamIdDO = None):
        """
            given date, return latest snapshotId that's just before that date
            in a given streamIdDO, if no streamIdDO check all streams
        """
        snaps = []
        if not streamIdDO:
            streamIdDOs = self.get_streams()
        else:
            streamIdDOs = [streamIdDO, ]
        for s in streamIdDOs:
            snaps.extend(self.get_snapshots_by_stream(s))
        # only snapshots from before odate
        # snaps is snapshotInfoDataObj
        ss = [s for s in snaps if s.dateCreated < odate]
        if len(ss) == 0:
            return None
        return self.get_snapshot( max(ss))

    def get_snapshot(self, snapshot):
        """
            given snapshot number, return snapshotId data object
        """
        snapshotIdDO = self.client.factory.create('snapshotIdDataObj')
        snapshotIdDO.id = snapshot
        return snapshotIdDO

    # given snapshot number, return snapshotInfo data object
    def get_snapshot_info(self, snapshot):
        logging.debug(snapshot)
        snapshotIdDO = self.client.factory.create('snapshotIdDataObj')
        snapshotIdDO.id = snapshot
        return self.client.service.getSnapshotInformation(snapshotIdDO)

    # given snapshot number return streamId it appears in
    def get_streamId_by_snapshot(self, snapshot):
        streamIdDOs = self.get_stream()
        for streamIdDO in streamIdDOs:
            if snapshot in self.get_snapshots_by_stream_as_list(streamIdDO): return streamIdDO

    # given snapshot number return stream name it appears in
    def get_stream_by_snapshot(self, snapshot):
        streamIdDOs = self.get_stream()
        for streamIdDO in streamIdDOs:
            if snapshot in self.get_snapshots_by_stream_as_list(streamIdDO):
                return streamIdDO.name

    # given a single streamIdDO return its snapshots as a list of streamInfoDOs
    def get_snapshots_by_stream(self, stream):
        snapshotFilterSpecDO = self.client.factory.create('snapshotFilterSpecDataObj')
        snDOs = self.client.service.getSnapshotsForStream(stream, snapshotFilterSpecDO)
        sns = []
        for sn in snDOs:
            sns.append(self.client.service.getSnapshotInformation(sn))
        return sns

    # given a streamIdDO return its snapshots as a list of streamIdDOs
    def get_snapshots_by_stream_as_list(self, stream):
        snapshotFilterSpecDO = self.client.factory.create('snapshotFilterSpecDataObj')
        snapshotIdDOs = self.client.service.getSnapshotsForStream(stream, snapshotFilterSpecDO)
        return ([s.id for s in snapshotIdDOs])

    # given list of streamIds and filter pattern (opt) return a list of
    # stream, snapshotIdDOs list tuples for these streams
    def get_snapshots(self, streamIdDOs, field = None, pattern = None):
        streamSnapshots = []
        snapshotFilterSpecDO = self.client.factory.create('snapshotFilterSpecDataObj')
        if field and pattern:
            setattr(snapshotFilterSpecDO, field+'Pattern', pattern)
        for stream in streamIdDOs:
            snapshotIdDOs = self.client.service.getSnapshotsForStream(stream, snapshotFilterSpecDO)
            streamSnapshots.append((stream.name, snapshotIdDOs))
        return streamSnapshots

    def get_attribute(self, attrname):
        vals = self.client.service.getAttribute({'name':attrname})
        logging.debug(vals)
        return [c.displayName for c in vals.configurableValues]

    def get_classification(self):
        return self.get_attribute('Classification')

    def get_action(self):
        return self.get_attribute('Action')

    def get_severity(self):
        return self.get_attribute('Severity')


    # old administration related classes
    # return userDataObj given username
    def user_details(self, username):
        userDO = self.client.service.getUser(username)
        return userDO

    def add_user_to_group(self, username, groupname):
        """
          username - existing user
          group - name of existing local group
          add user to group
          need to get the user object
          including the set of groups and create a new set out of it
          with all the old groups plus the new one
          This will throw an error for 'admin' user!
        """
        userOldDO = self.client.service.getUser(username)
        userDO = self.client.factory.create('userDataObj')
        userSpecDO = self.client.factory.create('userSpecDataObj')
        groups = []
        # hack to get around BZ that would not re-add old groups in 5.5
        # first update user's group to empty set
        groupIdDO = self.client.factory.create('groupIdDataObj')
        groupIdDO.name = 'Users'
        groups.append(groupIdDO)
        userSpecDO.groupNames = groups
        self.client.service.updateUser(username,userSpecDO)
        # then re-add all groups, old and new
        # end hack

        # add in all the other groups the User was in
        for oldgroup in getattr(userOldDO,'groups',[]):
            if oldgroup == "Users":
                continue
                groupIdDO = self.client.factory.create('groupIdDataObj')
            groupIdDO.name = oldgroup
            groups.append(groupIdDO)

        for newgroup in groupname.split(","):
            groupIdDO = self.client.factory.create('groupIdDataObj')
            groupIdDO.name = newgroup
            groups.append(groupIdDO)

        userSpecDO.groupNames = groups

        try:
            self.client.service.updateUser(username,userSpecDO)
            logging.info("Added user " + username + " to group " + groupname)
            return True
        except:
            logging.info("Error adding user " + username + " to group " + groupname)
            return False

    def copy_user(self, newusername, oldusername):
        userOldDO = self.client.service.getUser(oldusername)
        logging.debug(userOldDO)
        userDO = self.client.factory.create('userDataObj')
        userspecobj = self.client.factory.create('userSpecDataObj')
        userspecobj.username = newusername
        # if it's a local user a password needs to be set
        if userOldDO.local:
            userspecobj.password = 'coverity'
        userspecobj.disabled = userOldDO.disabled
        userspecobj.locked = userOldDO.locked
        userspecobj.local = userOldDO.local
        userspecobj.locale = userOldDO.locale
        groups = []
        groupIdDO = self.client.factory.create('groupIdDataObj')
        # add in all the groups the from User was in
        for grp in getattr(userOldDO,'groups',[]):
            if grp == "Users":
                continue
            groupIdDO = self.client.factory.create('groupIdDataObj')
            groupIdDO.name = grp
            groups.append(groupIdDO)

        userspecobj.groupNames = groups

        userspecobj.roleAssignments = []
        # role is roleAssignmentDataObj
        for role in getattr(userOldDO,'roleAssignments',[]):
            role.username = newusername
            userspecobj.roleAssignments.append(role)

        logging.debug(userspecobj)

        try:
            self.client.service.createUser(userspecobj)
            return True
        except Exception, err:
            logging.error("Error creating user:" + newusername)
            logging.error(str(err))
            return False

    # given username, email, update user's email.
    def update_user(self, username, email=None, role=None):
        userDO = self.client.factory.create('userDataObj')
        userOldDO = self.user_details(username)
        if not userOldDO:
            logging.error("No user found "+username)
            return

        userSpecDO = self.client.factory.create('userSpecDataObj')

        if email:
            userSpecDO.email = email

        userSpecDO.username = userOldDO.username

        if role:
            logging.error(role)
            userSpecDO.roleAssignments = getattr(userOldDO,'roleAssignments',[])
            ra = self.client.factory.create('roleAssignmentDataObj')
            ra.roleAssignmentType = 'user'
            ra.roleId = self.client.factory.create('roleIdDataObj')
            ra.roleId.name = role
            ra.type = 'global'
            ra.username = username
            ra.groupId = []
            userSpecDO.roleAssignments.append(ra)
            logging.error(userSpecDO)
        try:
            self.client.service.updateUser(username,userSpecDO)
            return True
        except Exception, err:
            logging.error("Error updating user:" + str(err))
            return False

    # given username of existing user, remove them from a local group
    # this will work for any user other than admin
    def remove_user_from_group(self, username, groupname):
        userOldDO = self.get_user(username)
        userDO = self.client.factory.create('userDataObj')
        userSpecDO = self.client.factory.create('userSpecDataObj')
        groups = []
        groupIdDO = self.client.factory.create('groupIdDataObj')
        groupIdDO.name = groupname

        # add in all the other groups the User was in
        if groupname not in getattr(userOldDO,'groups',[]):
            logging.warning("User " + username + " is not in group " + groupname)
            return

        for oldgroup in getattr(userOldDO,'groups',[]):
            if oldgroup != groupname:
                groupIdDO = self.client.factory.create('groupIdDataObj')
                groupIdDO.name = oldgroup
                groups.append(groupIdDO)

        userSpecDO.groupNames = groups

        try:
            self.client.service.updateUser(username,userSpecDO)
            logging.info("Removed user " + username + " from group " + groupname)
            return True
        except:
            logging.error("Error removing user " + username + " from group " + groupname)
            return False

    # given group name and LDAP flag,
    # add a group to CIM (local or ldap)
    def create_group(self, groupname, ldap=None, role=None):
        groupspecDO = self.client.factory.create('groupSpecDataObj')
        groupspecDO.name = groupname
        if ldap==True:
            groupspecDO.local = False
        else:
            groupspecDO.local = True
        groupspecDO.syncEnabled = False
        if role:
            groupspecDO.roleAssignments = []
            ra = self.client.factory.create('roleAssignmentDataObj')
            ra.roleAssignmentType = 'group'
            ra.roleId = self.client.factory.create('roleIdDataObj')
            ra.roleId.name = role
            ra.type = 'global'
            ra.groupId = {'name':groupname}
            groupspecDO.roleAssignments.append(ra)
            logging.debug(groupspecDO)
        try:
            self.client.service.createGroup(groupspecDO)
            return True
        except Exception, err:
            logging.error("Error creating group " + groupname)
            logging.error(err)
            return False

    # given a group name and a new name, rename this group (works for local groups only)
    def rename_group(self, groupname, newname):
        groupIdDO = self.client.factory.create('groupIdDataObj')
        groupIdDO.name = groupname
        try:
            groupOldDO = self.client.service.getGroup(groupIdDO)
        except:
            logging.error("Error getting group " + groupname)
            return False
        if not groupOldDO.local:
            logging.warning("LDAP groups cannot be renamed")
            return False
        groupSpecDO = self.client.factory.create('groupSpecDataObj')
        groupSpecDO.name = newname
        # even though these two aren't changing, the API expects them to be
        # filled in so copy old values over or set to what it should be and file a bug
        groupSpecDO.syncEnabled = groupOldDO.syncEnabled
        groupSpecDO.local = 'true'

        try:
            self.client.service.updateGroup(groupIdDO,groupSpecDO)
            return True
        except:
            logging.error("Error renaming group " + groupname)
            return False

    # add user to CIM based on given arguments (LDAP or local, if LDAP ignore unneeded args)
    def create_user(self, username, givenName=None, familyName=None, email=None, groups=None, password=None, ldap=False, locale = None, role=None, locked=False):
        userspecobj = self.client.factory.create('userSpecDataObj')
        userspecobj.disabled = False
        userspecobj.locked = locked
        userspecobj.username = username
        if ldap:
            userspecobj.local = False
        else:
            userspecobj.local = True
            userspecobj.email = email
            userspecobj.givenName = givenName
            userspecobj.familyName = familyName
            userspecobj.password = password
        if locale:
            userspecobj.locale = locale
        if groups and len(groups)> 0:
            userspecobj.groupNames = self.client.factory.create('groupIdDataObj')
            userspecobj.groupNames.name = groups
        if role and len(role) > 0:
            userspecobj.roleAssignments = []
            ra = self.client.factory.create('roleAssignmentDataObj')
            ra.roleAssignmentType = 'user'
            ra.roleId = self.client.factory.create('roleIdDataObj')
            ra.roleId.name = role
            ra.type = 'global'
            ra.username = username
            ra.groupId = []
            userspecobj.roleAssignments.append(ra)
        try:
            self.client.service.createUser(userspecobj)
            return True
        except Exception, err:
            logging.error("Error creating user " + username)
            logging.error(str(err))
            return False

    # return email address for user
    def get_email(self, username):
        userDO = self.client.service.getUser(username)
        return userDO.email

    # return all usernames (who are not disabled)
    def get_all_users(self):
        ufsDO = self.client.factory.create('userFilterSpecDataObj')
        ufsDO.assignable = True
        userPageDO = self.client.service.getUsers(ufsDO, self.pageSpecDO)
        users = []
        if userPageDO.totalNumberOfRecords > 0:
            for u in userPageDO.users:
                users.append(u.username)
        return users

    # given username string return user data object
    def get_user(self, username):
        return self.client.service.getUser(username)

    # given group name, return a list of usernames of its members
    def get_users_for_group(self, groupname):

        userFSDO = self.client.factory.create('userFilterSpecDataObj')
        userFSDO.groupsList = [groupname,]

        userPageDO = self.client.service.getUsers(userFSDO,self.pageSpecDO)
        if userPageDO.totalNumberOfRecords < 1:
            return []
        users = ([u.username for u in userPageDO.users])
        return users

    # send notification via CIM to users with given subject and message
    def send_notifications(self, usernames, subject, message):
        notifyResponse = self.client.service.notify(usernames, subject, message)
        return notifyResponse

    # new attributes, roles, etc.

    def set_role_project(self, projectname, groupname, role):

        projSpecDO = self.client.factory.create('projectSpecDataObj')
        for p in self.get_projects(projectname):
            if hasattr(p,'streams'):
                projSpecDO.streams = [s.id for s in getattr(p,'streams',[])]
            if hasattr(p,'streamLinks'):
                projSpecDO.streamLinks = [s.id for s in getattr(p,'streamLinks',[])]
            if hasattr(p,'roleAssignments'):
                projSpecDO.roleAssignments = getattr(p,'roleAssignments',[])
        groupIdDO = self.client.factory.create('groupIdDataObj')
        groupIdDO.name = groupname
        ra = self.client.factory.create('roleAssignmentDataObj')
        ra.groupId=groupIdDO
        ra.roleAssignmentType='group'
        riDO = self.client.factory.create('roleIdDataObj')
        riDO.name = role
        ra.roleId=riDO
        ra.type='project'
        projSpecDO.roleAssignments.append(ra)
        self.client.service.updateProject(p.id, projSpecDO)

    def set_owner_project(self, projectname, groupname):
        self.set_role_project(projectname, groupname, 'projectOwner')

    def set_admin_project(self, projectname, groupname):
        self.set_role_project(projectname, groupname, 'projectAdmin')

    def set_dev_project(self, projectname, groupname):
        self.set_role_project(projectname, groupname, 'developer')

    def fileToComponent(self, filepath, stream):
        try:
            s = self.get_streamDO(None, stream)[0]
            cm = self.get_component_maps(s.componentMapId.name)[0]
        except Exception, err:
            logging.error(str(err))
            logging.error("Couldn't get stream or its component map " + stream)
            return None

        for cpr in getattr(cm,'componentPathRules',[]):
            if re.search(cpr.pathPattern, filepath):
                return cm.componentMapId.name + '.' + cpr.componentId.name.split('.')[-1]
        return cm.componentMapId.name + '.' + 'Other'

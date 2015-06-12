###
### Author: Me
### Time-stamp: <2015-05-19 00:00:00>

from setuptools import setup

if __name__ == '__main__':
    setup(name='yam_fdw',
          author='Asya Kamsky',
          author_email='asya@kamsky.org',
          description='Yet Another Postgres fdw for MongoDB',
          url='http://github.com/asya999/yam_fdw',
          version='0.0.1',
          install_requires=['pymongo>=2.8.1,<3.0',
                            'python-dateutil'],
          packages=['yam_fdw'])

## Local Variables: ***
## mode:python ***
## coding: utf-8 ***
## End: ***

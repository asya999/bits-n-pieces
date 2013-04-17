typedef int BOOSTSCOPEDLOCK;
typedef int BOOSTMUTEX;
typedef void pthread_mutex_t;

BOOSTSCOPEDLOCK *l;

_ZN5boost7pthread25pthread_mutex_scoped_lockC9EP15pthread_mutex_t (pthread_mutex_t *l) {
	__coverity_exclusive_lock_acquire__(l);
}

_ZN5boost7pthread25pthread_mutex_scoped_lockD9Ev() {
	__coverity_exclusive_lock_acquire__(l);
}

_ZN5boost7pthread25pthread_mutex_scoped_lock6unlockEv() {
    __coverity_exclusive_lock_release__(l);   
}


// We only model Boost scoped locks for the boost::mutex class instantiation
// of the template.
// For other instantiations of the template, you will need to add more such 
// models
void 
_ZN5boost6detail6thread11scoped_lockINS_5mutexEEC9ERS3_b(BOOSTSCOPEDLOCK *l,
							 BOOSTMUTEX *m,
							 int x) {
    __coverity_lock_alias__(l, m);
    if (x)
	__coverity_exclusive_lock_acquire__(l);
}

void _ZN5boost6detail6thread11scoped_lockINS_5mutexEED9Ev(BOOSTSCOPEDLOCK *l) {
    __coverity_exclusive_lock_release__(l);
}

void _ZN5boost6detail6thread11scoped_lockINS_5mutexEE4lockEv(BOOSTSCOPEDLOCK *l) {
    __coverity_exclusive_lock_acquire__(l);
}

void _ZN5boost6detail6thread11scoped_lockINS_5mutexEE6unlockEv(BOOSTSCOPEDLOCK *l) {
    __coverity_exclusive_lock_release__(l);   
}


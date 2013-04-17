#include <iostream>

extern "C" { void __coverity_exclusive_lock_acquire__(void *); }

extern "C" { void __coverity_exclusive_lock_release__(void *); }

extern "C" { void __coverity_lock_alias__(void *, void *); }

namespace mongo {
    class mutex {
       class scoped_lock {
       public:
          scoped_lock( mongo::mutex &m ) { 
              __coverity_lock_alias__(this, &m);
              __coverity_exclusive_lock_acquire__(this);
          }
          ~scoped_lock() { 
              __coverity_exclusive_lock_release__(this);
          }
       };
    };

    class SimpleMutex {
       class scoped_lock {
       public:
          scoped_lock( mongo::SimpleMutex &m ) { 
              __coverity_lock_alias__(this, &m);
              __coverity_exclusive_lock_acquire__(this);
          }
          ~scoped_lock() { 
              __coverity_exclusive_lock_release__(this);
          }
          lock() { 
              __coverity_exclusive_lock_acquire__(this);
          }
          unlock() { 
              __coverity_exclusive_lock_release__(this);
          }
       };
    };

    typedef mongo::mutex::scoped_lock scoped_lock;

    class RSBase {
    private:
       mongo::mutex m;
       int _locked;
    public:
       class lock {
           // auto_ptr<scoped_lock> sl;
           // RSBase& rsbase;
       public:
           lock(RSBase *b) {
              __coverity_lock_alias__(this, b);
              __coverity_exclusive_lock_acquire__(this);
           }
           ~lock() {
              __coverity_exclusive_lock_release__(this);
           }
       };
    };
}
             
/* 
struct Lock;
struct AutoLock {
    nsAutoLock(Lock *a) {
        __coverity_lock_alias__(this, a);
        __coverity_exclusive_lock_acquire__(this);
    }
    ~nsAutoLock() {
        __coverity_exclusive_lock_release__(this);
    }
    void lock() {
        __coverity_exclusive_lock_acquire__(this);
    }
    void unlock() {
        __coverity_exclusive_lock_release__(this);
    }
};

*/

/*
#define MONGO_COMPILER_NORETURN


    MONGO_COMPILER_NORETURN void verifyFailed(const char *msg, const char *file, unsigned line) {
	__coverity_panic__();
    }
    MONGO_COMPILER_NORETURN void fassertFailed( int msgid ) {
	__coverity_panic__();
    }
    
    MONGO_COMPILER_NORETURN void uasserted(int msgid, const char *msg) {
	__coverity_panic__();
    }
    MONGO_COMPILER_NORETURN void uasserted(int msgid , const std::string &msg) {
	__coverity_panic__();
    }

    MONGO_COMPILER_NORETURN void msgassertedNoTrace(int msgid, const char *msg) {
	__coverity_panic__();
    }
    MONGO_COMPILER_NORETURN void msgasserted(int msgid, const char *msg) {
	__coverity_panic__();
    }
    MONGO_COMPILER_NORETURN void msgasserted(int msgid, const std::string &msg) {
	__coverity_panic__();
    }
*/

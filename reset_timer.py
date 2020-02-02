#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Timer Script von irgendwo ausm Internet 


# Includes
import threading
import time, sys

# Print to STDOUT
def printHard(*args):
    print(args)
    sys.stdout.flush()

# Timerklasse
class RU_Timer(threading.Thread):

    # Init
    def __init__(self, timeout, callback, *cb_args, **cb_kwargs):
        self.timeout = timeout
        self.callback = callback
        self.cb_args = cb_args
        self.cb_kwargs = cb_kwargs

        self.run_event = threading.Event()

        threading.Thread.__init__(self)

    # Timer stoppen
    def stop_timer(self):
        if not self.run_event.isSet():
            return False
        else:
            self.run_event.clear()
            return True

    # Timer starten
    def start_timer(self):
        if self.run_event.isSet():
            return False
        else:
            self.run_event.set()
            return True

    # Run Funktion
    def run(self):
        while(True):
            ticks = self.timeout

            # Timer Tick
            self.run_event.wait()
            while(self.run_event.isSet() and ticks):
                #printHard( "TICK")
                ticks -= 1
                time.sleep(0.1)

            # Zeit abgelaufen -> Callback
            if self.run_event.isSet():
                #printHard( "fire")
                self.run_event.clear()
                self.callback(*self.cb_args, **self.cb_kwargs)

            else:
                printHard( "timer stopped")

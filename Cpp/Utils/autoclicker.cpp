#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <unistd.h>

#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/extensions/XTest.h>



#include <iostream>
#include "X11/keysym.h"

// Key codes from: "/usr/include/X11/keysymdef.h"
int BUTTON_CAPSLOCK = XK_Caps_Lock;
int BUTTON_MOUSE_L = Button1;
int BUTTON_MOUSE_R = Button3;
int BUTTON_KEY_A = XK_A;

// https://stackoverflow.com/questions/18281412/check-keypress-in-c-on-linux/52801588
bool key_is_pressed(KeySym ks) {
    Display *dpy = XOpenDisplay(":0");
    char keys_return[32];
    XQueryKeymap(dpy, keys_return);
    KeyCode kc2 = XKeysymToKeycode(dpy, ks);
    bool isPressed = !!(keys_return[kc2 >> 3] & (1 << (kc2 & 7)));
    XCloseDisplay(dpy);
    return isPressed;
}

bool caps_is_down_prev = false;
bool caps_is_down_curr = false;
int  caps_is_down_delta = 0;
bool should_release = false;
bool update_caps_is_pressed() {
	caps_is_down_prev = caps_is_down_curr;
	caps_is_down_curr = key_is_pressed(BUTTON_CAPSLOCK);
	caps_is_down_delta = (caps_is_down_curr ? 1 : 0) - (caps_is_down_prev ? 1 : 0);
	bool changed = caps_is_down_delta == +1;
	return changed;
}

/*
void mouseClick_x11(int button, int downMillis, int upMillis) {
	Display *display = XOpenDisplay(NULL);

	XEvent event;
	
	if(display == NULL) {
		fprintf(stderr, "Error: failed to get display\n");
		exit(EXIT_FAILURE);
	}
	
	memset(&event, 0x00, sizeof(event));
	
	event.type = ButtonPress;
	event.xbutton.button = button;
	event.xbutton.same_screen = True;
	
	XQueryPointer(display, RootWindow(display, DefaultScreen(display)), &event.xbutton.root, &event.xbutton.window, &event.xbutton.x_root, &event.xbutton.y_root, &event.xbutton.x, &event.xbutton.y, &event.xbutton.state);
	
	event.xbutton.subwindow = event.xbutton.window;
	
	while(event.xbutton.subwindow) {
		event.xbutton.window = event.xbutton.subwindow;
		XQueryPointer(display, event.xbutton.window, &event.xbutton.root, &event.xbutton.subwindow, &event.xbutton.x_root, &event.xbutton.y_root, &event.xbutton.x, &event.xbutton.y, &event.xbutton.state);
	}
	
	if(XSendEvent(display, PointerWindow, True, 0xfff, &event) == 0) fprintf(stderr, "Error: failed to send event (ButtonPress)\n");
	
	XFlush(display);
	usleep(downMillis * 1000);
	
	event.type = ButtonRelease;
	event.xbutton.state = 0x100;
	
	if(XSendEvent(display, PointerWindow, True, 0xfff, &event) == 0) fprintf(stderr, "Error: failed to send event (ButtonRelease)\n");
	
	XFlush(display);
	usleep(upMillis * 1000);
	
	XCloseDisplay(display);
}
*/

void mouseClick_xtest(int button, int downMillis, int upMillis) {
	Display *display = XOpenDisplay(NULL);

	// click left button
	XTestFakeButtonEvent(display, button, true, 0);
	XFlush(display);
	usleep(downMillis * 1000);
	
	// release left mouse
	XTestFakeButtonEvent(display, button, false, 0);
	XFlush(display);
	XCloseDisplay(display);
	usleep(upMillis * 1000);
}
void mouseClick_xtest_L(int downMillis, int upMillis) { mouseClick_xtest(BUTTON_MOUSE_L, downMillis, upMillis); }
void mouseClick_xtest_R(int downMillis, int upMillis) { mouseClick_xtest(BUTTON_MOUSE_R, downMillis, upMillis); }

// source:
// https://stackoverflow.com/questions/2607010/linux-how-to-capture-screen-and-simulate-mouse-movements
// build:
// gcc -o autoclicker autoclicker.cpp -lX11
// gcc -o autoclicker autoclicker.cpp -lX11 -lXtst -lstdc++
int main(int argcount, const char** arguments) {

	// move mouse cursor
	/*
	int x = 400;
	int y = 400;
	Display *display = XOpenDisplay(0);
	Window root = DefaultRootWindow(display);
    XWarpPointer(display, None, root, 0, 0, 0, 0, x, y);
    XFlush(display);
    XCloseDisplay(display);
	*/
	
	// TOGGLE MOUSE ON OR OFF BASED ON CAPS STATE.
	for(int x=0;x<360000;x++) {
		bool changed = update_caps_is_pressed();
		if(changed) {
			printf("CHANGED\n");
			if(!should_release) {
				// mouse button down
				Display *display = XOpenDisplay(NULL);
				XTestFakeButtonEvent(display, BUTTON_MOUSE_L, true, 0);
				XFlush(display);
				XCloseDisplay(display);
				should_release = true;
				usleep(50000);
			} else if(should_release) {
				// mouse button up
				Display *display = XOpenDisplay(NULL);
				XTestFakeButtonEvent(display, BUTTON_MOUSE_L, false, 0);
				XFlush(display);
				XCloseDisplay(display);
				should_release = false;
				usleep(50000);
			}
		}
		usleep(10000);
	}
}





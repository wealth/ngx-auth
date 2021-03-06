import { InjectionToken, Injectable, Inject, Injector, NgModule } from '@angular/core';
import { Router } from '@angular/router';
import { map, first, switchMap, catchError } from 'rxjs/operators';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Essential service for authentication
 * @export
 * @abstract
 */
class AuthService {
}

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
const AUTH_SERVICE = new InjectionToken('AUTH_SERVICE');
const PUBLIC_FALLBACK_PAGE_URI = new InjectionToken('PUBLIC_FALLBACK_PAGE_URI');
const PROTECTED_FALLBACK_PAGE_URI = new InjectionToken('PROTECTED_FALLBACK_PAGE_URI');

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Guard, checks access token availability and allows or disallows access to page,
 * and redirects out
 *
 * usage: { path: 'test', component: TestComponent, canActivate: [ PublicGuard ] }
 *
 * @export
 */
class PublicGuard {
    /**
     * @param {?} authService
     * @param {?} protectedFallbackPageUri
     * @param {?} router
     */
    constructor(authService, protectedFallbackPageUri, router) {
        this.authService = authService;
        this.protectedFallbackPageUri = protectedFallbackPageUri;
        this.router = router;
    }
    /**
     * CanActivate handler
     * @param {?} _route
     * @param {?} state
     * @return {?}
     */
    canActivate(_route, state) {
        return this.authService.isAuthorized()
            .pipe(map((isAuthorized) => {
            if (isAuthorized && !this.isProtectedPage(state)) {
                this.navigate(this.protectedFallbackPageUri);
                return false;
            }
            return true;
        }));
    }
    /**
     * CanActivateChild handler
     * @param {?} route
     * @param {?} state
     * @return {?}
     */
    canActivateChild(route, state) {
        return this.canActivate(route, state);
    }
    /**
     * Check, if current page is protected fallback page
     * @param {?} state
     * @return {?}
     */
    isProtectedPage(state) {
        return state.url === this.protectedFallbackPageUri;
    }
    /**
     * Navigate away from the app / path
     * @param {?} url
     * @return {?}
     */
    navigate(url) {
        if (url.startsWith('http')) {
            window.location.href = url;
        }
        else {
            this.router.navigateByUrl(url);
        }
    }
}
PublicGuard.decorators = [
    { type: Injectable },
];
/** @nocollapse */
PublicGuard.ctorParameters = () => [
    { type: AuthService, decorators: [{ type: Inject, args: [AUTH_SERVICE,] }] },
    { type: String, decorators: [{ type: Inject, args: [PROTECTED_FALLBACK_PAGE_URI,] }] },
    { type: Router }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Guard, checks access token availability and allows or disallows access to page,
 * and redirects out
 *
 * usage: { path: 'test', component: TestComponent, canActivate: [ AuthGuard ] }
 *
 * @export
 */
class ProtectedGuard {
    /**
     * @param {?} authService
     * @param {?} publicFallbackPageUri
     * @param {?} router
     */
    constructor(authService, publicFallbackPageUri, router) {
        this.authService = authService;
        this.publicFallbackPageUri = publicFallbackPageUri;
        this.router = router;
    }
    /**
     * CanActivate handler
     * @param {?} _route
     * @param {?} state
     * @return {?}
     */
    canActivate(_route, state) {
        return this.authService.isAuthorized()
            .pipe(map((isAuthorized) => {
            if (!isAuthorized && !this.isPublicPage(state)) {
                this.navigate(this.publicFallbackPageUri);
                return false;
            }
            return true;
        }));
    }
    /**
     * CanActivateChild handler
     * @param {?} route
     * @param {?} state
     * @return {?}
     */
    canActivateChild(route, state) {
        return this.canActivate(route, state);
    }
    /**
     * Check, if current page is public fallback page
     * @param {?} state
     * @return {?}
     */
    isPublicPage(state) {
        return state.url === this.publicFallbackPageUri;
    }
    /**
     * Navigate away from the app / path
     * @param {?} url
     * @return {?}
     */
    navigate(url) {
        if (url.startsWith('http')) {
            window.location.href = url;
        }
        else {
            this.router.navigateByUrl(url);
        }
    }
}
ProtectedGuard.decorators = [
    { type: Injectable },
];
/** @nocollapse */
ProtectedGuard.ctorParameters = () => [
    { type: AuthService, decorators: [{ type: Inject, args: [AUTH_SERVICE,] }] },
    { type: String, decorators: [{ type: Inject, args: [PUBLIC_FALLBACK_PAGE_URI,] }] },
    { type: Router }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class AuthInterceptor {
    /**
     * @param {?} injector
     */
    constructor(injector) {
        this.injector = injector;
        /**
         * Is refresh token is being executed
         */
        this.refreshInProgress = false;
        /**
         * Notify all outstanding requests through this subject
         */
        this.refreshSubject = new Subject();
    }
    /**
     * Intercept an outgoing `HttpRequest`
     * @param {?} req
     * @param {?} delegate
     * @return {?}
     */
    intercept(req, delegate) {
        const /** @type {?} */ authService = this.injector.get(AUTH_SERVICE);
        if (authService.verifyTokenRequest(req)) {
            return delegate.handle(req);
        }
        return this.processIntercept(req, delegate);
    }
    /**
     * Process all the requests via custom interceptors.
     * @param {?} original
     * @param {?} delegate
     * @return {?}
     */
    processIntercept(original, delegate) {
        const /** @type {?} */ clone = original.clone();
        return this.request(clone)
            .pipe(switchMap((req) => delegate.handle(req)), catchError((res) => this.responseError(clone, res)));
    }
    /**
     * Request interceptor. Delays request if refresh is in progress
     * otherwise adds token to the headers
     * @param {?} req
     * @return {?}
     */
    request(req) {
        if (this.refreshInProgress) {
            return this.delayRequest(req);
        }
        return this.addToken(req);
    }
    /**
     * Failed request interceptor, check if it has to be processed with refresh
     * @param {?} req
     * @param {?} res
     * @return {?}
     */
    responseError(req, res) {
        const /** @type {?} */ authService = this.injector.get(AUTH_SERVICE);
        const /** @type {?} */ refreshShouldHappen = authService.refreshShouldHappen(res);
        if (refreshShouldHappen && !this.refreshInProgress) {
            this.refreshInProgress = true;
            authService
                .refreshToken()
                .subscribe(() => {
                this.refreshInProgress = false;
                this.refreshSubject.next(true);
            }, () => {
                this.refreshInProgress = false;
                this.refreshSubject.next(false);
            });
        }
        if (refreshShouldHappen && this.refreshInProgress) {
            return this.retryRequest(req, res);
        }
        return throwError(res);
    }
    /**
     * Add access token to headers or the request
     * @param {?} req
     * @return {?}
     */
    addToken(req) {
        const /** @type {?} */ authService = this.injector.get(AUTH_SERVICE);
        return authService.getAccessToken()
            .pipe(map((token) => {
            if (token) {
                let /** @type {?} */ setHeaders;
                if (typeof authService.getHeaders === 'function') {
                    setHeaders = authService.getHeaders(token, req);
                }
                else {
                    setHeaders = { Authorization: `Bearer ${token}` };
                }
                return req.clone({ setHeaders });
            }
            return req;
        }), first());
    }
    /**
     * Delay request, by subscribing on refresh event, once it finished, process it
     * otherwise throw error
     * @param {?} req
     * @return {?}
     */
    delayRequest(req) {
        return this.refreshSubject.pipe(first(), switchMap((status) => status ? this.addToken(req) : throwError(req)));
    }
    /**
     * Retry request, by subscribing on refresh event, once it finished, process it
     * otherwise throw error
     * @param {?} req
     * @param {?} res
     * @return {?}
     */
    retryRequest(req, res) {
        const /** @type {?} */ http = this.injector.get(HttpClient);
        return this.refreshSubject.pipe(first(), switchMap((status) => status ? http.request(req) : throwError(res || req)));
    }
}
AuthInterceptor.decorators = [
    { type: Injectable },
];
/** @nocollapse */
AuthInterceptor.ctorParameters = () => [
    { type: Injector }
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
class AuthModule {
}
AuthModule.decorators = [
    { type: NgModule, args: [{
                providers: [
                    PublicGuard,
                    ProtectedGuard,
                    AuthInterceptor,
                    {
                        provide: HTTP_INTERCEPTORS,
                        useClass: AuthInterceptor,
                        multi: true,
                    }
                ]
            },] },
];

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */

/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes} checked by tsc
 */
/**
 * Generated bundle index. Do not edit.
 */

export { AuthService, PublicGuard, ProtectedGuard, AUTH_SERVICE, PUBLIC_FALLBACK_PAGE_URI, PROTECTED_FALLBACK_PAGE_URI, AuthModule, AuthInterceptor as ɵa };
//# sourceMappingURL=ngx-auth.js.map

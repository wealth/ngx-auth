import { InjectionToken, Injectable, Inject, Injector, NgModule } from '@angular/core';
import { Router } from '@angular/router';
import { map, first, switchMap, catchError } from 'rxjs/operators';
import { HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';

var AuthService = /** @class */ (function () {
    function AuthService() {
    }
    return AuthService;
}());
var AUTH_SERVICE = new InjectionToken('AUTH_SERVICE');
var PUBLIC_FALLBACK_PAGE_URI = new InjectionToken('PUBLIC_FALLBACK_PAGE_URI');
var PROTECTED_FALLBACK_PAGE_URI = new InjectionToken('PROTECTED_FALLBACK_PAGE_URI');
var PublicGuard = /** @class */ (function () {
    function PublicGuard(authService, protectedFallbackPageUri, router) {
        this.authService = authService;
        this.protectedFallbackPageUri = protectedFallbackPageUri;
        this.router = router;
    }
    PublicGuard.prototype.canActivate = function (_route, state) {
        var _this = this;
        return this.authService.isAuthorized()
            .pipe(map(function (isAuthorized) {
            if (isAuthorized && !_this.isProtectedPage(state)) {
                _this.navigate(_this.protectedFallbackPageUri);
                return false;
            }
            return true;
        }));
    };
    PublicGuard.prototype.canActivateChild = function (route, state) {
        return this.canActivate(route, state);
    };
    PublicGuard.prototype.isProtectedPage = function (state) {
        return state.url === this.protectedFallbackPageUri;
    };
    PublicGuard.prototype.navigate = function (url) {
        if (url.startsWith('http')) {
            window.location.href = url;
        }
        else {
            this.router.navigateByUrl(url);
        }
    };
    return PublicGuard;
}());
PublicGuard.decorators = [
    { type: Injectable },
];
PublicGuard.ctorParameters = function () { return [
    { type: AuthService, decorators: [{ type: Inject, args: [AUTH_SERVICE,] }] },
    { type: String, decorators: [{ type: Inject, args: [PROTECTED_FALLBACK_PAGE_URI,] }] },
    { type: Router }
]; };
var ProtectedGuard = /** @class */ (function () {
    function ProtectedGuard(authService, publicFallbackPageUri, router) {
        this.authService = authService;
        this.publicFallbackPageUri = publicFallbackPageUri;
        this.router = router;
    }
    ProtectedGuard.prototype.canActivate = function (_route, state) {
        var _this = this;
        return this.authService.isAuthorized()
            .pipe(map(function (isAuthorized) {
            if (!isAuthorized && !_this.isPublicPage(state)) {
                _this.navigate(_this.publicFallbackPageUri);
                return false;
            }
            return true;
        }));
    };
    ProtectedGuard.prototype.canActivateChild = function (route, state) {
        return this.canActivate(route, state);
    };
    ProtectedGuard.prototype.isPublicPage = function (state) {
        return state.url === this.publicFallbackPageUri;
    };
    ProtectedGuard.prototype.navigate = function (url) {
        if (url.startsWith('http')) {
            window.location.href = url;
        }
        else {
            this.router.navigateByUrl(url);
        }
    };
    return ProtectedGuard;
}());
ProtectedGuard.decorators = [
    { type: Injectable },
];
ProtectedGuard.ctorParameters = function () { return [
    { type: AuthService, decorators: [{ type: Inject, args: [AUTH_SERVICE,] }] },
    { type: String, decorators: [{ type: Inject, args: [PUBLIC_FALLBACK_PAGE_URI,] }] },
    { type: Router }
]; };
var AuthInterceptor = /** @class */ (function () {
    function AuthInterceptor(injector) {
        this.injector = injector;
        this.refreshInProgress = false;
        this.refreshSubject = new Subject();
    }
    AuthInterceptor.prototype.intercept = function (req, delegate) {
        var authService = this.injector.get(AUTH_SERVICE);
        if (authService.verifyTokenRequest(req)) {
            return delegate.handle(req);
        }
        return this.processIntercept(req, delegate);
    };
    AuthInterceptor.prototype.processIntercept = function (original, delegate) {
        var _this = this;
        var clone = original.clone();
        return this.request(clone)
            .pipe(switchMap(function (req) { return delegate.handle(req); }), catchError(function (res) { return _this.responseError(clone, res); }));
    };
    AuthInterceptor.prototype.request = function (req) {
        if (this.refreshInProgress) {
            return this.delayRequest(req);
        }
        return this.addToken(req);
    };
    AuthInterceptor.prototype.responseError = function (req, res) {
        var _this = this;
        var authService = this.injector.get(AUTH_SERVICE);
        var refreshShouldHappen = authService.refreshShouldHappen(res);
        if (refreshShouldHappen && !this.refreshInProgress) {
            this.refreshInProgress = true;
            authService
                .refreshToken()
                .subscribe(function () {
                _this.refreshInProgress = false;
                _this.refreshSubject.next(true);
            }, function () {
                _this.refreshInProgress = false;
                _this.refreshSubject.next(false);
            });
        }
        if (refreshShouldHappen && this.refreshInProgress) {
            return this.retryRequest(req, res);
        }
        return throwError(res);
    };
    AuthInterceptor.prototype.addToken = function (req) {
        var authService = this.injector.get(AUTH_SERVICE);
        return authService.getAccessToken()
            .pipe(map(function (token) {
            if (token) {
                var setHeaders = void 0;
                if (typeof authService.getHeaders === 'function') {
                    setHeaders = authService.getHeaders(token, req);
                }
                else {
                    setHeaders = { Authorization: "Bearer " + token };
                }
                return req.clone({ setHeaders: setHeaders });
            }
            return req;
        }), first());
    };
    AuthInterceptor.prototype.delayRequest = function (req) {
        var _this = this;
        return this.refreshSubject.pipe(first(), switchMap(function (status) { return status ? _this.addToken(req) : throwError(req); }));
    };
    AuthInterceptor.prototype.retryRequest = function (req, res) {
        var http = this.injector.get(HttpClient);
        return this.refreshSubject.pipe(first(), switchMap(function (status) { return status ? http.request(req) : throwError(res || req); }));
    };
    return AuthInterceptor;
}());
AuthInterceptor.decorators = [
    { type: Injectable },
];
AuthInterceptor.ctorParameters = function () { return [
    { type: Injector }
]; };
var AuthModule = /** @class */ (function () {
    function AuthModule() {
    }
    return AuthModule;
}());
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

export { AuthService, PublicGuard, ProtectedGuard, AUTH_SERVICE, PUBLIC_FALLBACK_PAGE_URI, PROTECTED_FALLBACK_PAGE_URI, AuthModule, AuthInterceptor as ɵa };
//# sourceMappingURL=ngx-auth.js.map

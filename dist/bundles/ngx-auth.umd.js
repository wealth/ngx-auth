(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('@angular/router'), require('rxjs/operators'), require('@angular/common/http'), require('rxjs')) :
	typeof define === 'function' && define.amd ? define('ngx-auth', ['exports', '@angular/core', '@angular/router', 'rxjs/operators', '@angular/common/http', 'rxjs'], factory) :
	(factory((global['ngx-auth'] = {}),global.ng.core,global.ng.router,global.Rx.Observable.prototype,global.ng.common.http,global.rxjs));
}(this, (function (exports,core,router,operators,http,rxjs) { 'use strict';

var AuthService = /** @class */ (function () {
    function AuthService() {
    }
    return AuthService;
}());
var AUTH_SERVICE = new core.InjectionToken('AUTH_SERVICE');
var PUBLIC_FALLBACK_PAGE_URI = new core.InjectionToken('PUBLIC_FALLBACK_PAGE_URI');
var PROTECTED_FALLBACK_PAGE_URI = new core.InjectionToken('PROTECTED_FALLBACK_PAGE_URI');
var PublicGuard = /** @class */ (function () {
    function PublicGuard(authService, protectedFallbackPageUri, router$$1) {
        this.authService = authService;
        this.protectedFallbackPageUri = protectedFallbackPageUri;
        this.router = router$$1;
    }
    PublicGuard.prototype.canActivate = function (_route, state) {
        var _this = this;
        return this.authService.isAuthorized()
            .pipe(operators.map(function (isAuthorized) {
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
    { type: core.Injectable },
];
PublicGuard.ctorParameters = function () { return [
    { type: AuthService, decorators: [{ type: core.Inject, args: [AUTH_SERVICE,] }] },
    { type: String, decorators: [{ type: core.Inject, args: [PROTECTED_FALLBACK_PAGE_URI,] }] },
    { type: router.Router }
]; };
var ProtectedGuard = /** @class */ (function () {
    function ProtectedGuard(authService, publicFallbackPageUri, router$$1) {
        this.authService = authService;
        this.publicFallbackPageUri = publicFallbackPageUri;
        this.router = router$$1;
    }
    ProtectedGuard.prototype.canActivate = function (_route, state) {
        var _this = this;
        return this.authService.isAuthorized()
            .pipe(operators.map(function (isAuthorized) {
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
    { type: core.Injectable },
];
ProtectedGuard.ctorParameters = function () { return [
    { type: AuthService, decorators: [{ type: core.Inject, args: [AUTH_SERVICE,] }] },
    { type: String, decorators: [{ type: core.Inject, args: [PUBLIC_FALLBACK_PAGE_URI,] }] },
    { type: router.Router }
]; };
var AuthInterceptor = /** @class */ (function () {
    function AuthInterceptor(injector) {
        this.injector = injector;
        this.refreshInProgress = false;
        this.refreshSubject = new rxjs.Subject();
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
            .pipe(operators.switchMap(function (req) { return delegate.handle(req); }), operators.catchError(function (res) { return _this.responseError(clone, res); }));
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
        return rxjs.throwError(res);
    };
    AuthInterceptor.prototype.addToken = function (req) {
        var authService = this.injector.get(AUTH_SERVICE);
        return authService.getAccessToken()
            .pipe(operators.map(function (token) {
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
        }), operators.first());
    };
    AuthInterceptor.prototype.delayRequest = function (req) {
        var _this = this;
        return this.refreshSubject.pipe(operators.first(), operators.switchMap(function (status) { return status ? _this.addToken(req) : rxjs.throwError(req); }));
    };
    AuthInterceptor.prototype.retryRequest = function (req, res) {
        var http$$1 = this.injector.get(http.HttpClient);
        return this.refreshSubject.pipe(operators.first(), operators.switchMap(function (status) { return status ? http$$1.request(req) : rxjs.throwError(res || req); }));
    };
    return AuthInterceptor;
}());
AuthInterceptor.decorators = [
    { type: core.Injectable },
];
AuthInterceptor.ctorParameters = function () { return [
    { type: core.Injector }
]; };
var AuthModule = /** @class */ (function () {
    function AuthModule() {
    }
    return AuthModule;
}());
AuthModule.decorators = [
    { type: core.NgModule, args: [{
                providers: [
                    PublicGuard,
                    ProtectedGuard,
                    AuthInterceptor,
                    {
                        provide: http.HTTP_INTERCEPTORS,
                        useClass: AuthInterceptor,
                        multi: true,
                    }
                ]
            },] },
];

exports.AuthService = AuthService;
exports.PublicGuard = PublicGuard;
exports.ProtectedGuard = ProtectedGuard;
exports.AUTH_SERVICE = AUTH_SERVICE;
exports.PUBLIC_FALLBACK_PAGE_URI = PUBLIC_FALLBACK_PAGE_URI;
exports.PROTECTED_FALLBACK_PAGE_URI = PROTECTED_FALLBACK_PAGE_URI;
exports.AuthModule = AuthModule;
exports.ɵa = AuthInterceptor;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ngx-auth.umd.js.map

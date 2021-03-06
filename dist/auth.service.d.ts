import { HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
/**
 * Essential service for authentication
 * @export
 */
export declare abstract class AuthService {
    /**
     * Check, if user already authorized.
     *
     * Should return Observable with true or false values
     */
    abstract isAuthorized(): Observable<boolean>;
    /**
     * Get access token
     *
     * Should return access token in Observable from e.g.
     * localStorage
     */
    abstract getAccessToken(): Observable<string>;
    /**
     * Function, that should perform refresh token verifyTokenRequest
     *
     * Should be successfully completed so interceptor
     * can execute pending requests or retry original one
     */
    abstract refreshToken(): Observable<any>;
    /**
     * Function, checks response of failed request to determine,
     * whether token be refreshed or not.
     *
     * Essentially checks status
     */
    abstract refreshShouldHappen(response: HttpErrorResponse): boolean;
    /**
     * Verify that outgoing request is refresh-token,
     * so interceptor won't intercept this request
     */
    abstract verifyTokenRequest(req: HttpRequest<any>): boolean;
    /**
     * Add token to headers, dependent on server
     * set-up, by default adds a bearer token.
     * Called by interceptor.
     *
     * To change behavior, override this method.
     */
    abstract getHeaders?(token: string, req: HttpRequest<any>): {
        [name: string]: string | string[];
    };
}

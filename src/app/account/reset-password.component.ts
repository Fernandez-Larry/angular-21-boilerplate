import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs';

import { AccountService, AlertService } from '@app/_services';
import { MustMatch } from '@app/_helpers';

@Component({ templateUrl: 'reset-password.component.html', standalone: false })
export class ResetPasswordComponent implements OnInit {
    tokenStatus: 'validating' | 'valid' | 'invalid' = 'validating';
    token?: string;
    form!: FormGroup;
    loading = false;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.form = this.formBuilder.group({
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required],
        }, {
            validator: MustMatch('password', 'confirmPassword')
        });

        const routeToken = this.route.snapshot.queryParamMap.get('token');
        const browserToken = new URLSearchParams(window.location.search).get('token');
        const token = routeToken || browserToken;

        console.log('ResetPassword URL:', window.location.href);
        console.log('ResetPassword route queryParams:', this.route.snapshot.queryParams);
        console.log('ResetPassword routeToken:', routeToken, 'browserToken:', browserToken);

        if (!token) {
            console.log('No reset token found in URL.');
            this.tokenStatus = 'invalid';
            return;
        }

        console.log('Validating reset token:', token);
        this.accountService.validateResetToken(token)
            .pipe(first())
            .subscribe({
                next: (response) => {
                    console.log('validateResetToken success response:', response);
                    this.token = token;
                    this.tokenStatus = 'valid';
                    console.log('reset-password status set to valid; form visible:', this.tokenStatus === 'valid');
                    this.cdr.detectChanges();
                },
                error: (error) => {
                    console.error('validateResetToken error:', error);
                    this.tokenStatus = 'invalid';
                    console.log('reset-password status set to invalid');
                    this.cdr.detectChanges();
                }
            });
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;

        // reset alerts on submit
        this.alertService.clear();

        // stop here if form is invalid
        if (this.form.invalid) {
            return;
        }

        // ensure token is present before submitting to avoid 400 from backend
        if (!this.token) {
            console.error('Attempted resetPassword submit without token');
            this.alertService.error('Token is required');
            return;
        }

        this.loading = true;
        this.accountService.resetPassword(this.token!, this.f['password'].value, this.f['confirmPassword'].value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Password reset successful, you can now login', { keepAfterRouteChange: true });
                    this.router.navigate(['../login'], { relativeTo: this.route });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }
}
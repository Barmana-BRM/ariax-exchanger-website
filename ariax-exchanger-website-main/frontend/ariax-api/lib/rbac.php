<?php

if (!function_exists('ariaxCanonicalRole')) {
    function ariaxCanonicalRole(?string $role): string
    {
        $normalized = strtolower(trim((string)$role));
        return match ($normalized) {
            'super_admin', 'system_admin', 'root', 'admin' => 'admin',
            'kyc', 'kyc_admin', 'kyc_manager', 'kyc_operator' => 'kyc_operator',
            'support', 'support_agent', 'support_operator' => 'support',
            'finance', 'finance_admin', 'finance_manager', 'accounting' => 'finance_manager',
            default => $normalized !== '' ? $normalized : 'user',
        };
    }
}

if (!function_exists('ariaxRoleLabel')) {
    function ariaxRoleLabel(string $role): string
    {
        return match (ariaxCanonicalRole($role)) {
            'admin' => 'ادمین کل سیستم',
            'kyc_operator' => 'اپراتور KYC',
            'support' => 'پشتیبان',
            'finance_manager' => 'مدیر مالی',
            default => 'کاربر عادی',
        };
    }
}

if (!function_exists('ariaxRoleCapabilities')) {
    function ariaxRoleCapabilities(): array
    {
        return [
            'user' => [
                'auth.login',
                'auth.logout',
                'auth.refresh',
                'profile.view_own',
                'profile.update_own',
                'kyc.submit_own',
                'kyc.view_own',
                'tickets.create_own',
                'tickets.view_own',
                'tickets.reply_own',
                'transactions.create_own',
                'transactions.view_own',
                'market.view',
            ],
            'support' => [
                'auth.login',
                'auth.logout',
                'auth.refresh',
                'tickets.view_all',
                'tickets.reply_all',
                'tickets.update_all',
                'messages.view_all',
                'messages.create_all',
                'tasks.view_all',
                'tasks.create_all',
                'tasks.update_all',
                'market.view',
            ],
            'kyc_operator' => [
                'auth.login',
                'auth.logout',
                'auth.refresh',
                'kyc.view_all',
                'kyc.review_all',
                'users.view_limited',
                'tickets.view_all',
                'tickets.reply_all',
                'market.view',
            ],
            'finance_manager' => [
                'auth.login',
                'auth.logout',
                'auth.refresh',
                'transactions.view_all',
                'transactions.review_all',
                'stats.view',
                'users.view_limited',
                'tickets.view_all',
                'market.view',
            ],
            'admin' => ['*'],
        ];
    }
}

if (!function_exists('ariaxCan')) {
    function ariaxCan(array $auth, string $capability): bool
    {
        $role = ariaxCanonicalRole($auth['role'] ?? null);
        $capabilities = ariaxRoleCapabilities();
        return in_array('*', $capabilities[$role] ?? [], true) || in_array($capability, $capabilities[$role] ?? [], true);
    }
}

if (!function_exists('ariaxRequireRole')) {
    function ariaxRequireRole(array $auth, array|string $roles): void
    {
        $allowed = array_map('ariaxCanonicalRole', (array)$roles);
        $role = ariaxCanonicalRole($auth['role'] ?? null);
        if (!in_array($role, $allowed, true)) {
            respond(['error' => 'دسترسی ندارید'], 403);
        }
    }
}


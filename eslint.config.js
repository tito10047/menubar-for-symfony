export default [
    {
        files: ['dist/**/*.js'],
        rules: {
            'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: false }],
        },
    },
];

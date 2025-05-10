# Contributing to WritePad

Thank you for your interest in contributing to WritePad! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to maintain a respectful and inclusive community.

## How to Contribute

There are several ways you can contribute to WritePad:

1. **Reporting Bugs**: Create an issue with a detailed description of the bug, steps to reproduce, and expected behavior.
2. **Suggesting Enhancements**: Create an issue with your feature idea, describing what you want and why it would be valuable.
3. **Code Contributions**: Submit pull requests with bug fixes or new features.
4. **Documentation**: Help improve documentation, including README, code comments, or this contributing guide.

## Development Workflow

### Setting up the Development Environment

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/writepad.git
   cd writepad
   ```
3. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

### Branching Strategy

1. Create a new branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-you-are-fixing
   ```
2. Make your changes
3. Commit with meaningful commit messages
4. Push your branch to your fork
5. Submit a pull request

## Pull Request Process

1. Ensure your code follows the project's style and naming conventions
2. Add tests for new features if applicable
3. Ensure all tests pass with `npm test`
4. Update documentation as necessary
5. Fill out the pull request template completely
6. Request review from maintainers

## Code Standards

### Coding Style

- Use TypeScript for type safety
- Follow existing code style and conventions
- Format your code with Prettier (`npm run format`)
- Ensure your code passes ESLint (`npm run lint`)

### Component Guidelines

- Create small, reusable components
- Follow React best practices
- Use Tailwind CSS for styling
- Maintain accessibility standards (WCAG)

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): short description

[optional body]

[optional footer]
```

Types include:
- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Formatting changes
- refactor: Code changes that neither fix bugs nor add features
- test: Adding or modifying tests
- chore: Changes to build process or tooling

## License

By contributing to WritePad, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

## Questions?

If you have any questions about contributing, please open an issue with the label "question". 
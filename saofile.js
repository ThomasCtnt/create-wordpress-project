const path = require('path');

module.exports = {
  prompts: [
    {
      name: 'name',
      type: 'string',
      message: 'Project name',
      default: 'www.fqdn.com',
      store: true,
    },
    {
      name: 'slug',
      type: 'string',
      message: 'Project slug (used as plugins prefix and theme name)',
      default: 'fqdn',
    },
    {
      name: 'description',
      type: 'string',
      message: 'Project description',
      default: ({ name }) => `Repository for ${name}.`,
    },
    {
      name: 'url',
      type: 'string',
      message: 'Project URL',
      default: ({ name }) => `https://${name}`,
    },
    {
      name: 'hub',
      message: 'Where is the project’s repository?',
      type: 'list',
      choices: [
        { name: 'GitLab', value: 'git@gitlab.com:studiometa' },
        { name: 'GitHub', value: 'git@github.com:studiometa' },
      ],
      default: 0,
    },
    {
      name: 'repository',
      type: 'string',
      message: 'Project repository',
      default: ({ name, hub }) => `${hub}/${name}.git`,
    },
    {
      name: 'features',
      message: 'Choose features to add',
      type: 'checkbox',
      choices: [
        { name: 'ACF', value: 'acf' },
        { name: 'WP Rocket', value: 'wpRocket' },
      ],
      default: [],
    },
  ],
  templateData() {
    const { features } = this.answers;
    const acf = features.includes('acf');
    const wpRocket = features.includes('wpRocket');

    return {
      acf,
      wpRocket,
    };
  },
  actions() {
    const actions = [
      {
        type: 'add',
        files: '**',
        filters: {
          '*.DS_Store': false,
          '/node_modules/*': false,
          '/vendor/*': false,
        },
        templateDir: 'template',
      },
      {
        type: 'move',
        patterns: {
          'web/wp-content/themes/<%= slug %>': `web/wp-content/themes/${this.answers.slug}`,
          _gitignore: '.gitignore',
        },
      },
    ];

    // Remove GitLab files based on the selected hub
    if (!this.answers.hub.includes('gitlab.com')) {
      actions.push({
        type: 'remove',
        files: '.gitlab-ci.yml',
      });
    }

    return actions;
  },
  async completed() {
    const { outDir } = this.sao.opts;

    // Allow execution of the shell scripts
    [
      'bin/cleanup-composer-install.sh',
      'bin/db-export.sh',
      'bin/db-import.sh',
      'bin/generate-wp-config.sh',
      'bin/get-wp-salts.sh',
    ].forEach(file => {
      this.fs.chmodSync(path.resolve(outDir, file), 0o765);
    });

    // Init Git and install NPM dependencies
    this.gitInit();
    await this.npmInstall({ npmClient: 'npm' });

    // Display useful informations
    const { chalk } = this;
    const isNewFolder = this.outDir !== process.cwd();
    const relativeOutFolder = path.relative(process.cwd(), this.outDir);
    const tab = '    ';

    console.log();
    console.log(
      chalk`${tab}🎉 {bold Successfully created project} {cyan ${this.answers.name}}!`
    );
    console.log();
    console.log(chalk`${tab}{bold To get started:}\n`);

    if (isNewFolder) {
      console.log(chalk`${tab}Go in your project's directory:`);
      console.log(chalk`${tab}{cyan cd ${relativeOutFolder}}\n`);
    }
    console.log(chalk`${tab}Create your .env file and fill it:`);
    console.log(chalk`${tab}{cyan cp .env.example .env}\n`);
    console.log(chalk`${tab}Generate your project's salt keys:`);
    console.log(chalk`${tab}{cyan bin/get-wp-salts.sh}\n`);
    console.log(chalk`${tab}Install the composer dependencies:`);
    console.log(chalk`${tab}{cyan composer install}\n`);
    console.log(chalk`${tab}Start the development server:`);
    console.log(chalk`${tab}{cyan npm run dev}\n`);
    console.log(chalk`${tab}🎊 {bold Happy coding!}\n`);
  },
};

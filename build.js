'use strict';

const fs = require('fs');
const path = require('path');

const hogan = require('hogan.js');
const sharp = require('sharp');

function toSlug(t) {
  return t.toLowerCase().replace(/ /g,'-').replace(/[^\w-]+/g,'');
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function hasClass(bool, name) {
  if(bool) return name + ' ';
  return '';
}

class Project {

  constructor(website, json) {
    this.website = website;

    this.ignore = json.ignore;

    this.name = json.name;
    this.url = json.url;
    this.blurb = json.blurb;
    this.image = json.image;
    this.tags = json.tags;
    this.roles = json.roles;
    this.tools = json.tools;

    
    this.slug = toSlug(this.name);
    
    if(json.featured) this.website.projects.featured = this;

    this.featured = json.featured;
    this.compact = json.compact || false;
    
    this.processPromise = null;
  }

  getImageUrl(tag) {
    if(!tag) tag = 'main';
    
    return 'output/images/' + this.slug + '-' + tag + '.jpg';
  }

  processImage() {

    console.log(path.join('projects/', this.image));

    var image = sharp(path.join('projects/', this.image));

    var promises = [
      image
        .resize(1920, 1080)
        .min()
        .quality(90)
        .jpeg()
        .progressive()
        .toFile(this.getImageUrl())
      ,
      /*
      image
        .resize(1920/4, 1080/4)
        .blur(5)
        .min()
        .quality(90)
        .toFile(this.getImageUrl('blur'))
      ,*/
      image
        .resize(480 * 2, 320 * 2)
        .crop()
        .quality(90)
        .toFile(this.getImageUrl('side'))
      ,
      image
        .resize(192, 108)
        .blur(5)
        .min()
        .quality(80)
        .toFile(this.getImageUrl('thumb'))
    ];

    return Promise.all(promises);
  }

  processImages() {
    if(this.compact) {
      return new Promise((resolve) => {resolve();});
    }
    
    return Promise.all([
      this.processImage()
    ]);
  }

  process() {
    if(!this.processPromise) {
      this.processPromise = Promise.all([
        this.processImages()
      ]);
    }

    return this.processPromise;
  }

  getHtml() {
    return this.website.templates.project.render(this.getData());
  }

  getData() {

    return {
      name: this.name,
      blurb: this.blurb,
      url: this.url,
      featured: this.featured,
      classes: hasClass(this.featured, 'featured') + hasClass(this.compact, 'compact'),
      compact: this.compact,
      tags: this.tags.map((p) => { return {tag: p}; }),
      tools: this.tools.map((p) => { return {tool: capitalizeFirstLetter(p)}; }),
      image: {
        url: this.getImageUrl(),
        side_url: this.getImageUrl('side'),
        //blur_url: this.getImageUrl('blur'),
        tiny_url: this.getImageUrl('thumb')
      }
    };
  }
  
}
class Website {

  constructor() {

    this.templates = [];

    this.pages = {};

    this.projects = {
      list: [],
      featured: null
    };
    
    this.compileTemplates([
      'home',
      'project'
    ])
      .then(() => {
        return this.readProjects();
      })
      .then(() => {
        return this.generate();
      })
      .then(() => {
        return this.writeOut();
      });
    
  }
  
  compileTemplate(name) {
    return new Promise((resolve, reject) => {
      
      fs.readFile(path.join('template', name + '.html'), 'utf8', (err, data) => {
        if(err) {
          reject(err);
          return;
        }

        var template = hogan.compile(data);
        this.templates[name] = template;
        
        resolve(template);
      });
      
    });
    
  }

  compileTemplates(names) {
    
    return Promise.all(names.map((name) => {
      return this.compileTemplate(name);
    }));
    
  }

  readProjects(names) {
    
    return new Promise((resolve, reject) => {
      fs.readFile('projects.json', 'utf8', (err, data) => {
        if(err) {
          reject(err);
          return;
        }

        var json = JSON.parse(data);
        
        var projects = json.map((value) => {
          return new Project(this, value);
        });

        this.projects.list = projects.filter((v) => { return !v.ignore; });

        resolve(projects);
      });
      
    });
    
  }

  generate() {

    return Promise.all(this.projects.list.map((value) => {
      return value.process();
    }))
      .then(() => {
        
        var featured = this.projects.list[0];

        if(this.projects.featured) {
          featured = this.projects.featured;
        }

        featured = featured.getData();

        var projectsHtml = this.projects.list.map((p) => {
          return p.getHtml();
        }).join('\n');
        
        this.pages['index.html'] = this.templates.home.render({

          projects: {
            html: projectsHtml,
            featured: featured
          }
          
        });
        
      });
  }

  writeOut() {
    for(var page in this.pages) {
      fs.writeFileSync(page, this.pages[page]);
    }
  }

}

new Website();

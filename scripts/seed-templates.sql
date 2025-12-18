-- Seed Templates Script
-- Run this in your Supabase SQL Editor to populate the templates table
-- This bypasses RLS since you're running as admin

-- Modern Landing Page
INSERT INTO templates (id, name, description, content, html, css, theme, tags, category, thumbnail_html, is_active)
VALUES (
  'modern-landing-hero',
  'Modern Landing Page',
  'A clean, modern landing page with hero section, features, and call-to-action',
  '{"assets":[],"styles":[],"pages":[{"frames":[{"component":{"type":"wrapper","components":[{"tagName":"section","attributes":{"data-gjs-name":"Hero Section"},"style":{"min-height":"500px","background":"linear-gradient(135deg, #667eea 0%, #764ba2 100%)","color":"white","display":"flex","align-items":"center","justify-content":"center","text-align":"center","padding":"60px 20px"},"components":[{"tagName":"div","components":[{"tagName":"h1","type":"text","components":[{"type":"textnode","content":"Build Something Amazing"}],"style":{"font-size":"48px","margin-bottom":"20px"}},{"tagName":"p","type":"text","components":[{"type":"textnode","content":"Create beautiful websites with our modern platform"}],"style":{"font-size":"20px","margin-bottom":"30px","opacity":"0.9"}},{"tagName":"button","type":"text","components":[{"type":"textnode","content":"Get Started"}],"style":{"background":"white","color":"#667eea","border":"none","padding":"15px 40px","font-size":"18px","border-radius":"8px","cursor":"pointer","font-weight":"bold"}}]}]}]}}]}]}',
  '<section style="min-height:500px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;display:flex;align-items:center;justify-content:center;text-align:center;padding:60px 20px"><div><h1 style="font-size:48px;margin-bottom:20px">Build Something Amazing</h1><p style="font-size:20px;margin-bottom:30px;opacity:0.9">Create beautiful websites with our modern platform</p><button style="background:white;color:#667eea;border:none;padding:15px 40px;font-size:18px;border-radius:8px;cursor:pointer;font-weight:bold">Get Started</button></div></section>',
  '',
  '{"primaryColor":"#667eea","secondaryColor":"#ffffff","fontFamily":"Arial, sans-serif","borderRadius":"8px"}',
  ARRAY['landing', 'modern', 'hero', 'gradient'],
  'business',
  '<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:40px;color:white;text-align:center;height:100%;display:flex;align-items:center;justify-content:center"><div><h2 style="margin:0 0 10px 0">Modern Landing</h2><p style="margin:0;opacity:0.8">Hero Section</p></div></div>',
  true
);

-- Portfolio Showcase
INSERT INTO templates (id, name, description, content, html, css, theme, tags, category, thumbnail_html, is_active)
VALUES (
  'portfolio-showcase',
  'Portfolio Showcase',
  'Elegant portfolio template with project gallery and about section',
  '{"assets":[],"styles":[],"pages":[{"frames":[{"component":{"type":"wrapper","components":[{"tagName":"section","attributes":{"data-gjs-name":"Portfolio Header"},"style":{"padding":"80px 20px","background":"#1a1a1a","color":"white","text-align":"center"},"components":[{"tagName":"h1","type":"text","components":[{"type":"textnode","content":"Creative Portfolio"}],"style":{"font-size":"42px","margin-bottom":"10px"}},{"tagName":"p","type":"text","components":[{"type":"textnode","content":"Designer & Developer"}],"style":{"font-size":"18px","color":"#999"}}]}]}}]}]}',
  '<section style="padding:80px 20px;background:#1a1a1a;color:white;text-align:center"><h1 style="font-size:42px;margin-bottom:10px">Creative Portfolio</h1><p style="font-size:18px;color:#999">Designer & Developer</p></section>',
  '',
  '{"primaryColor":"#8b5cf6","secondaryColor":"#f3f4f6","fontFamily":"Georgia, serif","borderRadius":"4px"}',
  ARRAY['portfolio', 'creative', 'showcase'],
  'portfolio',
  '<div style="background:#1a1a1a;padding:40px;color:white;text-align:center;height:100%;display:flex;align-items:center;justify-content:center"><div><h2 style="margin:0 0 10px 0;color:#8b5cf6">Portfolio</h2><p style="margin:0;color:#999">Showcase</p></div></div>',
  true
);

-- Product Page
INSERT INTO templates (id, name, description, content, html, css, theme, tags, category, thumbnail_html, is_active)
VALUES (
  'ecommerce-product',
  'Product Page',
  'Modern e-commerce product page with image gallery and details',
  '{"assets":[],"styles":[],"pages":[{"frames":[{"component":{"type":"wrapper","components":[{"tagName":"section","attributes":{"data-gjs-name":"Product Section"},"style":{"padding":"60px 20px","background":"#f9fafb","display":"grid","grid-template-columns":"1fr 1fr","gap":"40px","max-width":"1200px","margin":"0 auto"}}]}}]}]}',
  '<section style="padding:60px 20px;background:#f9fafb;display:grid;grid-template-columns:1fr 1fr;gap:40px;max-width:1200px;margin:0 auto"><div style="background:#e5e7eb;border-radius:12px;height:400px;display:flex;align-items:center;justify-content:center"><p style="color:#6b7280">Product Image</p></div><div><h1 style="font-size:36px;margin-bottom:10px">Premium Product</h1><p style="font-size:28px;color:#10b981;font-weight:bold;margin-bottom:20px">$99.99</p><button style="background:#3b82f6;color:white;border:none;padding:15px 40px;font-size:16px;border-radius:8px;cursor:pointer">Add to Cart</button></div></section>',
  '',
  '{"primaryColor":"#3b82f6","secondaryColor":"#f9fafb","fontFamily":"Arial, sans-serif","borderRadius":"12px"}',
  ARRAY['ecommerce', 'product', 'shop'],
  'ecommerce',
  '<div style="background:#f9fafb;padding:30px;height:100%;display:flex;align-items:center;justify-content:center;gap:20px"><div style="background:#e5e7eb;width:80px;height:80px;border-radius:8px"></div><div><h3 style="margin:0 0 5px 0;color:#1f2937">Product</h3><p style="margin:0;color:#10b981;font-weight:bold">$99.99</p></div></div>',
  true
);

-- Blog Article
INSERT INTO templates (id, name, description, content, html, css, theme, tags, category, thumbnail_html, is_active)
VALUES (
  'blog-article',
  'Blog Article',
  'Clean blog post template with typography and reading layout',
  '{"assets":[],"styles":[],"pages":[{"frames":[{"component":{"type":"wrapper","components":[{"tagName":"article","attributes":{"data-gjs-name":"Article"},"style":{"max-width":"700px","margin":"0 auto","padding":"60px 20px","font-family":"Georgia, serif"}}]}}]}]}',
  '<article style="max-width:700px;margin:0 auto;padding:60px 20px;font-family:Georgia,serif"><h1 style="font-size:42px;margin-bottom:20px;line-height:1.2">The Art of Web Design</h1><p style="color:#6b7280;margin-bottom:30px;font-size:14px">Published on January 15, 2025</p><p style="font-size:18px;line-height:1.8;margin-bottom:20px">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p></article>',
  '',
  '{"primaryColor":"#1f2937","secondaryColor":"#ffffff","fontFamily":"Georgia, serif","borderRadius":"4px"}',
  ARRAY['blog', 'article', 'content'],
  'blog',
  '<div style="background:white;padding:30px;height:100%;display:flex;flex-direction:column;justify-content:center"><h3 style="margin:0 0 10px 0;color:#1f2937;font-size:16px">Blog Article</h3><div style="background:#e5e7eb;height:4px;width:80%;margin-bottom:8px"></div><div style="background:#e5e7eb;height:4px;width:60%;margin-bottom:8px"></div><div style="background:#e5e7eb;height:4px;width:90%"></div></div>',
  true
);

-- Contact Form
INSERT INTO templates (id, name, description, content, html, css, theme, tags, category, thumbnail_html, is_active)
VALUES (
  'contact-form',
  'Contact Form',
  'Professional contact page with form and information',
  '{"assets":[],"styles":[],"pages":[{"frames":[{"component":{"type":"wrapper","components":[{"tagName":"section","attributes":{"data-gjs-name":"Contact Section"},"style":{"padding":"80px 20px","background":"linear-gradient(to bottom, #f3f4f6, #ffffff)","text-align":"center"}}]}}]}]}',
  '<section style="padding:80px 20px;background:linear-gradient(to bottom,#f3f4f6,#ffffff);text-align:center"><h2 style="font-size:36px;margin-bottom:40px">Get In Touch</h2><form style="max-width:500px;margin:0 auto;display:flex;flex-direction:column;gap:15px"><input type="text" placeholder="Your Name" style="padding:15px;border:1px solid #d1d5db;border-radius:8px;font-size:16px"><input type="email" placeholder="Your Email" style="padding:15px;border:1px solid #d1d5db;border-radius:8px;font-size:16px"><textarea placeholder="Your Message" rows="5" style="padding:15px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;resize:vertical"></textarea><button type="submit" style="background:#2563eb;color:white;border:none;padding:15px;border-radius:8px;font-size:16px;cursor:pointer;font-weight:bold">Send Message</button></form></section>',
  '',
  '{"primaryColor":"#2563eb","secondaryColor":"#f3f4f6","fontFamily":"Arial, sans-serif","borderRadius":"8px"}',
  ARRAY['contact', 'form', 'communication'],
  'business',
  '<div style="background:linear-gradient(to bottom,#f3f4f6,#fff);padding:30px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center"><h3 style="margin:0 0 15px 0;color:#1f2937">Contact</h3><div style="width:100%;max-width:200px"><div style="background:#d1d5db;height:30px;border-radius:4px;margin-bottom:8px"></div><div style="background:#d1d5db;height:30px;border-radius:4px;margin-bottom:8px"></div><div style="background:#2563eb;height:35px;border-radius:4px"></div></div></div>',
  true
);

-- Pricing Table
INSERT INTO templates (id, name, description, content, html, css, theme, tags, category, thumbnail_html, is_active)
VALUES (
  'pricing-table',
  'Pricing Table',
  'Modern pricing page with three-tier plan comparison',
  '{"assets":[],"styles":[],"pages":[{"frames":[{"component":{"type":"wrapper","components":[{"tagName":"section","attributes":{"data-gjs-name":"Pricing Section"},"style":{"padding":"80px 20px","background":"#ffffff","text-align":"center"}}]}}]}]}',
  '<section style="padding:80px 20px;background:#fff;text-align:center"><h2 style="font-size:40px;margin-bottom:50px">Choose Your Plan</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:30px;max-width:1000px;margin:0 auto"><div style="background:#f9fafb;padding:40px;border-radius:12px;border:2px solid #e5e7eb"><h3 style="font-size:24px;margin-bottom:10px">Basic</h3><p style="font-size:32px;font-weight:bold;color:#2563eb">$9/mo</p></div></div></section>',
  '',
  '{"primaryColor":"#2563eb","secondaryColor":"#ffffff","fontFamily":"Arial, sans-serif","borderRadius":"12px"}',
  ARRAY['pricing', 'business', 'saas'],
  'business',
  '<div style="background:white;padding:25px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center"><h3 style="margin:0 0 15px 0;color:#1f2937;font-size:14px">Pricing Plans</h3><div style="display:flex;gap:10px"><div style="background:#f9fafb;width:50px;height:70px;border-radius:6px;border:1px solid #e5e7eb"></div><div style="background:#f9fafb;width:50px;height:70px;border-radius:6px;border:1px solid #2563eb;border-width:2px"></div><div style="background:#f9fafb;width:50px;height:70px;border-radius:6px;border:1px solid #e5e7eb"></div></div></div>',
  true
);

-- Team About Page
INSERT INTO templates (id, name, description, content, html, css, theme, tags, category, thumbnail_html, is_active)
VALUES (
  'team-about',
  'Team About Page',
  'Meet the team page with member profiles and bios',
  '{"assets":[],"styles":[],"pages":[{"frames":[{"component":{"type":"wrapper","components":[{"tagName":"section","attributes":{"data-gjs-name":"Team Section"},"style":{"padding":"80px 20px","background":"#ffffff"}}]}}]}]}',
  '<section style="padding:80px 20px;background:#fff"><h2 style="font-size:40px;text-align:center;margin-bottom:60px">Meet Our Team</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:40px;max-width:1200px;margin:0 auto"><div style="text-align:center"><div style="width:120px;height:120px;background:#e5e7eb;border-radius:50%;margin:0 auto 20px"></div><h3 style="font-size:20px;margin-bottom:5px">John Doe</h3><p style="color:#6b7280;font-size:14px">CEO & Founder</p></div></div></section>',
  '',
  '{"primaryColor":"#1f2937","secondaryColor":"#ffffff","fontFamily":"Arial, sans-serif","borderRadius":"8px"}',
  ARRAY['team', 'about', 'people'],
  'business',
  '<div style="background:white;padding:25px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center"><h3 style="margin:0 0 20px 0;color:#1f2937;font-size:14px">Our Team</h3><div style="display:flex;gap:12px"><div style="text-align:center"><div style="width:40px;height:40px;background:#e5e7eb;border-radius:50%;margin:0 auto 5px"></div><div style="background:#e5e7eb;height:8px;width:35px;margin:0 auto"></div></div><div style="text-align:center"><div style="width:40px;height:40px;background:#e5e7eb;border-radius:50%;margin:0 auto 5px"></div><div style="background:#e5e7eb;height:8px;width:35px;margin:0 auto"></div></div></div></div>',
  true
);

-- Newsletter Signup
INSERT INTO templates (id, name, description, content, html, css, theme, tags, category, thumbnail_html, is_active)
VALUES (
  'newsletter-signup',
  'Newsletter Signup',
  'Clean newsletter subscription page with email capture',
  '{"assets":[],"styles":[],"pages":[{"frames":[{"component":{"type":"wrapper","components":[{"tagName":"section","attributes":{"data-gjs-name":"Newsletter Section"},"style":{"min-height":"400px","background":"linear-gradient(135deg, #f093fb 0%, #f5576c 100%)","color":"white","display":"flex","align-items":"center","justify-content":"center","text-align":"center","padding":"60px 20px"}}]}}]}]}',
  '<section style="min-height:400px;background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);color:white;display:flex;align-items:center;justify-content:center;text-align:center;padding:60px 20px"><div style="max-width:500px"><h2 style="font-size:40px;margin-bottom:15px">Stay Updated</h2><p style="font-size:18px;margin-bottom:30px;opacity:0.9">Get the latest news and updates delivered to your inbox</p><form style="display:flex;gap:10px"><input type="email" placeholder="Enter your email" style="flex:1;padding:15px;border:none;border-radius:8px;font-size:16px"><button style="background:#1f2937;color:white;border:none;padding:15px 30px;border-radius:8px;cursor:pointer;font-weight:bold">Subscribe</button></form></div></section>',
  '',
  '{"primaryColor":"#f5576c","secondaryColor":"#ffffff","fontFamily":"Arial, sans-serif","borderRadius":"8px"}',
  ARRAY['newsletter', 'email', 'marketing'],
  'marketing',
  '<div style="background:linear-gradient(135deg,#f093fb 0%,#f5576c 100%);padding:30px;color:white;text-align:center;height:100%;display:flex;align-items:center;justify-content:center"><div><h3 style="margin:0 0 10px 0;font-size:16px">Newsletter</h3><div style="background:white;height:30px;border-radius:6px;display:flex;align-items:center;padding:5px;gap:5px"><div style="flex:1;background:#f3f4f6;height:100%;border-radius:4px"></div><div style="background:#1f2937;height:100%;width:60px;border-radius:4px"></div></div></div></div>',
  true
);

-- Verify templates were inserted
SELECT id, name, category FROM templates ORDER BY created_at;

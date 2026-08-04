from pathlib import Path
import re
import urllib.parse

# Update Category.html order links
category_path = Path('Category.html')
text = category_path.read_text(encoding='utf-8')

article_pattern = re.compile(r'(<article class="card">.*?<a class="order-button" href="index2\.html#order">Order this product</a>.*?</article>)', re.S)
changed = 0

def repl_article(match):
    global changed
    block = match.group(1)
    title_match = re.search(r'<h2>([^<]+)</h2>', block)
    if not title_match:
        return block
    title = title_match.group(1).strip()
    encoded = urllib.parse.quote_plus(title)
    new_block = block.replace('href="index2.html#order"', f'href="index2.html?product={encoded}#order"')
    if new_block != block:
        changed += 1
    return new_block

new_text = article_pattern.sub(repl_article, text)
category_path.write_text(new_text, encoding='utf-8')
print(f'Category.html updated links: {changed}')

# Update index2.html select options and add JS handling
index_path = Path('index2.html')
text2 = index_path.read_text(encoding='utf-8')
old_options = re.search(r'(<select id="product" name="product" required>.*?</select>)', text2, re.S)
if not old_options:
    raise SystemExit('Could not find product select in index2.html')
new_options = '''<select id="product" name="product" required>
                        <option value="">Choose a product</option>
                        <option value="Cotton Tissu">Cotton Tissu</option>
                        <option value="Sachet Tissu">Sachet Tissu</option>
                        <option value="Silk Tissu">Silk Tissu</option>
                        <option value="Linen Tissu">Linen Tissu</option>
                        <option value="Wool Tissu">Wool Tissu</option>
                        <option value="Polyester Tissu">Polyester Tissu</option>
                        <option value="Sneakers">Sneakers</option>
                        <option value="Boots">Boots</option>
                        <option value="Sandals">Sandals</option>
                        <option value="Heels">Heels</option>
                        <option value="Loafers">Loafers</option>
                        <option value="Premium Parfum">Premium Parfum</option>
                        <option value="Oriental Parfum">Oriental Parfum</option>
                        <option value="Analog Watch">Analog Watch</option>
                        <option value="Digital Watch">Digital Watch</option>
                        <option value="Smart Watch">Smart Watch</option>
                        <option value="Luxury Watch">Luxury Watch</option>
                        <option value="Sport Watch">Sport Watch</option>
                    </select>'''
text2 = text2[:old_options.start(1)] + new_options + text2[old_options.end(1):]

if 'const productSelect = document.getElementById(\'product\');' not in text2:
    insert_point = text2.rfind("        document.querySelector('.order-form')")
    if insert_point == -1:
        raise SystemExit('Could not find insertion point in index2.html')
    insert_text = """        const productSelect = document.getElementById('product');
        const urlParams = new URLSearchParams(window.location.search);
        const productFromUrl = urlParams.get('product');
        if (productFromUrl && productSelect) {
            const decodedName = decodeURIComponent(productFromUrl.replace(/\+/g, ' '));
            const existingOption = Array.from(productSelect.options).find(opt => opt.value === decodedName || opt.text === decodedName);
            if (existingOption) {
                existingOption.selected = true;
            } else {
                const customOption = document.createElement('option');
                customOption.value = decodedName;
                customOption.text = decodedName;
                customOption.selected = true;
                productSelect.appendChild(customOption);
            }
        }

"""
    text2 = text2[:insert_point] + insert_text + text2[insert_point:]

index_path.write_text(text2, encoding='utf-8')
print('index2.html updated')

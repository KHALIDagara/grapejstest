class CreatePages < ActiveRecord::Migration[8.0]
  def change
    create_table :pages do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false, default: "Untitled Page"
      t.json :content, default: {}
      t.text :html
      t.text :css
      t.json :theme, default: {}
      t.json :messages, default: []

      t.timestamps
    end
    add_index :pages, [:user_id, :updated_at]
  end
end

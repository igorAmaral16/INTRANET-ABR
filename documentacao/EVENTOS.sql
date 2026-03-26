-- Tabela de Eventos da Empresa
CREATE TABLE IF NOT EXISTS Eventos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  
  titulo VARCHAR(150) NOT NULL,
  descricao TEXT NOT NULL,
  
  data_inicio DATETIME NOT NULL,
  data_fim DATETIME NOT NULL,
  
  local VARCHAR(255) NULL,
  
  imagem_url VARCHAR(500) NULL,
  
  status ENUM('RASCUNHO','PUBLICADO','RASCUNHO') NOT NULL DEFAULT 'RASCUNHO',
  
  publicado_por_admin_id BIGINT UNSIGNED NULL,
  publicado_por_nome VARCHAR(100) NULL,
  publicado_em DATETIME NULL,
  
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id),
  KEY idx_evento_status (status),
  KEY idx_evento_data_inicio (data_inicio),
  KEY idx_evento_data_fim (data_fim),
  KEY idx_evento_published (status, data_inicio),
  
  CONSTRAINT fk_evento_pub_admin FOREIGN KEY (publicado_por_admin_id)
    REFERENCES Administracao(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

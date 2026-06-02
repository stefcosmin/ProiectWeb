<?php

class CategoryController {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function processRequest($method, $id) {
        switch ($method) {
            case 'GET':
                if ($id) {
                    $this->getCategory($id);
                } else {
                    $this->getAllCategories();
                }
                break;
            case 'POST':
                $this->createCategory();
                break;
            case 'PUT':
                if ($id) {
                    $this->updateCategory($id);
                }
                break;
            case 'DELETE':
                if ($id) {
                    $this->deleteCategory($id);
                }
                break;
            default:
                http_response_code(405);
                echo json_encode(['message' => 'Method not allowed']);
                break;
        }
    }

    private function getAllCategories() {
        $stmt = $this->pdo->query('SELECT * FROM categories');
        $categories = $stmt->fetchAll();
        echo json_encode($categories);
    }

    private function getCategory($id) {
        $stmt = $this->pdo->prepare('SELECT * FROM categories WHERE id = ?');
        $stmt->execute([$id]);
        $category = $stmt->fetch();
        if ($category) {
            echo json_encode($category);
        } else {
            http_response_code(404);
            echo json_encode(['message' => 'Category not found']);
        }
    }

    private function createCategory() {
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['name'])) {
            $stmt = $this->pdo->prepare('INSERT INTO categories (name) VALUES (?)');
            $stmt->execute([$data['name']]);
            http_response_code(201);
            echo json_encode(['id' => $this->pdo->lastInsertId(), 'name' => $data['name']]);
        } else {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid data']);
        }
    }

    private function updateCategory($id) {
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['name'])) {
            $stmt = $this->pdo->prepare('UPDATE categories SET name = ? WHERE id = ?');
            $stmt->execute([$data['name'], $id]);
            echo json_encode(['message' => 'Category updated']);
        } else {
            http_response_code(400);
            echo json_encode(['message' => 'Invalid data']);
        }
    }

    private function deleteCategory($id) {
        $stmt = $this->pdo->prepare('DELETE FROM categories WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['message' => 'Category deleted']);
    }
}
